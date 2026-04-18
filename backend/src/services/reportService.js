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
 * Khớp bảng Cài đặt KPI: cột «KPI tháng» — lịch đặt hóa chất, check-in, doanh thu tháng, sản phẩm;
 * thợ phụ thêm lịch đặt gội (ngưỡng tháng = 4× lịch đặt gội tuần, chỉ bật khi ngưỡng tuần > 0).
 */
function checksActiveMonth(cfg, type) {
  const isAsst = type === "assistant";
  const monthlyRev = Number(cfg.monthlyRevenue);
  return {
    bookings: (cfg.monthlyBookings ?? 0) > 0,
    checkin: (cfg.monthlyCheckinRate ?? 0) > 0,
    revenue: Number.isFinite(monthlyRev) && monthlyRev > 0,
    products: (cfg.monthlyProducts ?? 0) > 0,
    wash: isAsst && (cfg.weeklyWash ?? 0) > 0
  };
}

/**
 * Khớp bảng Cài đặt KPI: cột «KPI tuần» — lịch đặt hóa chất, check-in; thợ phụ thêm lịch đặt gội.
 * Không có KPI tuần cho doanh thu / sản phẩm (trong UI là «—») nên không trả checksActive cho các ô đó.
 */
function checksActiveWeek(cfg, type) {
  const isAsst = type === "assistant";
  return {
    bookings: (cfg.weeklyBookings ?? 0) > 0,
    checkin: (cfg.weeklyCheckinRate ?? 0) > 0,
    wash: isAsst && (cfg.weeklyWash ?? 0) > 0
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
    const targetBookingsMonth = Number(cfg.monthlyBookings ?? 0);
    const targetCheckinMonth = Number(cfg.monthlyCheckinRate ?? 0);
    const targetProductsMonth = Number(cfg.monthlyProducts ?? 0);
    const targetWashMonth = Number(cfg.weeklyWash ?? 0) * 4;
    /** Mọi chỉ tiêu KPI tháng: đạt khi thực tế >= ngưỡng trong cài đặt (kể cả bằng ngưỡng). */
    const checks = {
      bookings: totalBookings >= targetBookingsMonth,
      checkin: checkinRate >= targetCheckinMonth,
      revenue: totalRevenue >= monthlyRevOk,
      products: totalProducts >= targetProductsMonth
    };

    if (person.type === "assistant") {
      checks.wash = totalWash >= targetWashMonth;
    }

    const checksActive = checksActiveMonth(cfg, person.type);
    const allPass = Object.values(checks).every(Boolean);
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
    const checks = {
      bookings: totalBookings >= targetBookingsWeek,
      checkin: checkinRate >= targetCheckinWeek
    };

    if (person.type === "assistant") {
      checks.wash = totalWash >= targetWashWeek;
    }

    const checksActive = checksActiveWeek(cfg, person.type);
    const allPass = Object.values(checks).every(Boolean);
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
      allPass
    };
  });
}

function calculateSalaryReport(staff, attendanceRows, kpiRows, adjustments, kpiConfig, holdHistoryMap = new Map()) {
  const attendanceMap = new Map();
  for (const row of attendanceRows) {
    if (!attendanceMap.has(row.staff_id)) attendanceMap.set(row.staff_id, []);
    attendanceMap.get(row.staff_id).push(row);
  }

  const kpiMap = new Map(kpiRows.map((item) => [item.id, item]));

  return staff.map((person) => {
    const rows = attendanceMap.get(person.id) || [];
    const workDays = rows.filter((r) => r.present === 1).length;
    const base = Math.round((person.base_salary / 30) * workDays);
    const kpiResult = kpiMap.get(person.id);
    const failPenalty = kpiResult?.allPass ? 0 : kpiConfig.penalties.failKpiPenalty;

    const myAdjustments = adjustments.filter((a) => a.staff_id === person.id);
    const commission = myAdjustments.filter((a) => a.type === "commission").reduce((s, v) => s + v.amount, 0);
    const booking8 = myAdjustments.filter((a) => a.type === "booking8").reduce((s, v) => s + v.amount, 0);
    const kpiBonus = myAdjustments.filter((a) => a.type === "kpibonus").reduce((s, v) => s + v.amount, 0);
    const penalties = myAdjustments.filter((a) => a.type === "penalty").reduce((s, v) => s + v.amount, 0);

    const salaryBeforeHold = base + commission + booking8 + kpiBonus - failPenalty - penalties;
    const monthlyHoldCap = Math.max(0, Math.round(salaryBeforeHold * 0.15));
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
