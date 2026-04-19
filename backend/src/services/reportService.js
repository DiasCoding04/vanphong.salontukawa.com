function mergeStaffKpiCfg(person, kpiConfig, staffKpiConfigMap) {
  const base = kpiConfig[person.type];
  const ov = staffKpiConfigMap.get(person.id);
  if (!ov) return base;
  const merged = { ...base };
  for (const [k, v] of Object.entries(ov)) {
    if (v !== null && v !== undefined) merged[k] = v;
  }
  return merged;
}

/**
 * Khớp bảng Cài đặt KPI: cột «KPI tháng» — chỉ doanh thu tháng và sản phẩm.
 * Lịch đặt hóa chất, check-in, lịch đặt gội chỉ dùng cho KPI tuần.
 */
function checksActiveMonth(cfg) {
  return {
    revenue: cfg.monthlyRevenue !== null && cfg.monthlyRevenue !== undefined,
    products: cfg.monthlyProducts !== null && cfg.monthlyProducts !== undefined
  };
}

/**
 * Khớp bảng Cài đặt KPI: cột «KPI tuần» — lịch đặt hóa chất, check-in; thợ phụ thêm lịch đặt gội.
 * Không có KPI tuần cho doanh thu / sản phẩm (trong UI là «—») nên không trả checksActive cho các ô đó.
 */
function checksActiveWeek(cfg, type) {
  const isAsst = type === "assistant";
  return {
    bookings: cfg.weeklyBookings !== null && cfg.weeklyBookings !== undefined,
    checkin: cfg.weeklyCheckinRate !== null && cfg.weeklyCheckinRate !== undefined,
    wash: isAsst && cfg.weeklyWash !== null && cfg.weeklyWash !== undefined
  };
}

function calculateKpiByStaff(staff, attendanceRows, kpiConfig, staffKpiConfigMap = new Map()) {
  const byStaff = new Map();
  for (const row of attendanceRows) {
    if (!byStaff.has(row.staff_id)) byStaff.set(row.staff_id, []);
    byStaff.get(row.staff_id).push(row);
  }

  return staff.map((person) => {
    const allRows = byStaff.get(person.id) || [];
    const rows = allRows.filter((r) => r.present === 1);
    /** Doanh thu: cộng mọi dòng trong tháng (đã chấm), không chỉ ngày có mặt — khớp tổng thực tế trên bảng chấm công. */
    const totalRevenue = allRows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);
    const totalBookings = rows.reduce((sum, r) => sum + r.bookings, 0);
    const totalCheckins = rows.reduce((sum, r) => sum + r.checkins, 0);
    const totalClients = rows.reduce((sum, r) => sum + r.total_clients, 0);
    const totalWash = rows.reduce((sum, r) => sum + r.wash, 0);
    const totalProducts = rows.reduce((sum, r) => sum + (Number(r.products) || 0), 0);
    const checkinRate = totalClients > 0 ? Math.round((totalCheckins / totalClients) * 100) : 0;

    const cfg = mergeStaffKpiCfg(person, kpiConfig, staffKpiConfigMap);
    const monthlyRevTarget = Number(cfg.monthlyRevenue);
    const monthlyRevOk = Number.isFinite(monthlyRevTarget) ? monthlyRevTarget : 0;
    const targetProductsMonth = Number(cfg.monthlyProducts ?? 0);
    /** KPI tháng: chỉ doanh thu và sản phẩm (đạt khi thực tế >= ngưỡng). */
    const checksActive = checksActiveMonth(cfg);
    const hasActiveKpi = Object.values(checksActive).some(Boolean);
    const checks = {
      revenue: checksActive.revenue ? totalRevenue >= monthlyRevOk : true,
      products: checksActive.products ? totalProducts >= targetProductsMonth : true
    };

    const allPass = hasActiveKpi && Object.values(checks).every(Boolean);
    const presentDays = rows.length;
    return {
      ...person,
      totalClients,
      totalCheckins: totalCheckins,
      presentDays,
      totalBookings,
      totalRevenue,
      totalWash,
      totalProducts,
      checkinRate,
      checks,
      checksActive,
      hasActiveKpi,
      allPass
    };
  });
}

/**
 * KPI theo khoảng [from, to] do route truyền (thường đủ 7 ngày Thứ Hai–Chủ nhật). Độc lập với KPI tháng.
 * Ngưỡng weekly*; staff_kpi_settings do route nạp theo tháng neo (ví dụ tháng chứa Thứ Hai).
 */
function calculateKpiWeekByStaff(staff, attendanceRows, kpiConfig, staffKpiConfigMap = new Map()) {
  const byStaff = new Map();
  for (const row of attendanceRows) {
    if (!byStaff.has(row.staff_id)) byStaff.set(row.staff_id, []);
    byStaff.get(row.staff_id).push(row);
  }

  return staff.map((person) => {
    const allRows = byStaff.get(person.id) || [];
    const rows = allRows.filter((r) => r.present === 1);
    const totalRevenue = allRows.reduce((sum, r) => sum + (Number(r.revenue) || 0), 0);
    const totalBookings = rows.reduce((sum, r) => sum + r.bookings, 0);
    const totalCheckins = rows.reduce((sum, r) => sum + r.checkins, 0);
    const totalClients = rows.reduce((sum, r) => sum + r.total_clients, 0);
    const totalWash = rows.reduce((sum, r) => sum + r.wash, 0);
    const totalProducts = rows.reduce((sum, r) => sum + (Number(r.products) || 0), 0);
    const checkinRate = totalClients > 0 ? Math.round((totalCheckins / totalClients) * 100) : 0;

    const cfg = mergeStaffKpiCfg(person, kpiConfig, staffKpiConfigMap);
    const targetBookingsWeek = Number(cfg.weeklyBookings ?? 0);
    const targetCheckinWeek = Number(cfg.weeklyCheckinRate ?? 0);
    const targetWashWeek = Number(cfg.weeklyWash ?? 0);
    /** Mọi chỉ tiêu KPI tuần: đạt khi thực tế >= ngưỡng trong cài đặt (kể cả bằng ngưỡng). */
    const checksActive = checksActiveWeek(cfg, person.type);
    const hasActiveKpi = Object.values(checksActive).some(Boolean);
    const checks = {
      bookings: checksActive.bookings ? totalBookings >= targetBookingsWeek : true,
      checkin: checksActive.checkin ? checkinRate >= targetCheckinWeek : true
    };

    if (person.type === "assistant") {
      checks.wash = checksActive.wash ? totalWash >= targetWashWeek : true;
    }

    const allPass = hasActiveKpi && Object.values(checks).every(Boolean);
    const presentDays = rows.length;
    return {
      ...person,
      totalClients,
      totalCheckins: totalCheckins,
      presentDays,
      totalBookings,
      totalRevenue,
      totalWash,
      totalProducts,
      checkinRate,
      checks,
      checksActive,
      hasActiveKpi,
      allPass
    };
  });
}

function calculateSalaryReport(staff, attendanceRows, kpiRows, adjustments, kpiConfig, holdHistoryMap = new Map(), month = "") {
  const attendanceMap = new Map();
  for (const row of attendanceRows) {
    if (!attendanceMap.has(row.staff_id)) attendanceMap.set(row.staff_id, []);
    attendanceMap.get(row.staff_id).push(row);
  }

  const kpiMap = new Map(kpiRows.map((item) => [item.id, item]));

  // Tính số ngày trong tháng (mặc định 30 nếu không có month)
  let daysInMonth = 30;
  if (month && month.includes("-")) {
    const [y, m] = month.split("-").map(Number);
    daysInMonth = new Date(y, m, 0).getDate();
  }

  return staff.map((person) => {
    const rows = attendanceMap.get(person.id) || [];
    const workDays = rows.filter((r) => r.present === 1).length;
    const base = Math.round((person.base_salary / daysInMonth) * workDays);
    const kpiResult = kpiMap.get(person.id);
    
    // Nếu đạt (allPass = true), hoặc nếu không có KPI nào được cấu hình (hasActiveKpi = false) thì không phạt.
    const failPenalty = (kpiResult?.allPass || !kpiResult?.hasActiveKpi) ? 0 : kpiConfig.penalties.failKpiPenalty;

    const myAdjustments = adjustments.filter((a) => a.staff_id === person.id);
    const commission = myAdjustments.filter((a) => a.type === "commission").reduce((s, v) => s + v.amount, 0);
    const booking8 = myAdjustments.filter((a) => a.type === "booking8").reduce((s, v) => s + v.amount, 0);
    const kpiBonus = myAdjustments.filter((a) => a.type === "kpibonus").reduce((s, v) => s + v.amount, 0);
    const penalties = myAdjustments.filter((a) => a.type === "penalty").reduce((s, v) => s + v.amount, 0);

    const salaryBeforeHold = base + commission + booking8 + kpiBonus - failPenalty - penalties;
    const holdRate = kpiConfig.monthlyHoldRate ?? 0.15;
    const monthlyHoldCap = Math.max(0, Math.round(salaryBeforeHold * holdRate));
    const holdState = holdHistoryMap.get(person.id) || { deductedBefore: 0, deductedCurrent: null };
    const holdRemainingBefore = Math.max(0, (person.hold_remaining || 0) - holdState.deductedBefore);
    const suggestedHoldDeduction = Math.min(holdRemainingBefore, monthlyHoldCap);
    const holdDeduction = holdState.deductedCurrent ?? suggestedHoldDeduction;
    const holdRemainingAfter = Math.max(0, holdRemainingBefore - holdDeduction);

    return {
      ...person,
      workDays,
      base,
      commission,
      booking8,
      kpiBonus,
      failPenalty,
      penalties,
      holdDeduction,
      holdRemainingBefore,
      holdRemainingAfter,
      holdStatus: holdRemainingAfter > 0 ? `${holdRemainingAfter} VND` : "Da giam du",
      total: salaryBeforeHold - holdDeduction
    };
  });
}

module.exports = { calculateKpiByStaff, calculateKpiWeekByStaff, calculateSalaryReport };
