function calculateKpiByStaff(staff, attendanceRows, kpiConfig, staffKpiConfigMap = new Map()) {
  const byStaff = new Map();
  for (const row of attendanceRows) {
    if (!byStaff.has(row.staff_id)) byStaff.set(row.staff_id, []);
    byStaff.get(row.staff_id).push(row);
  }

  return staff.map((person) => {
    const rows = (byStaff.get(person.id) || []).filter((r) => r.present === 1);
    const totalBookings = rows.reduce((sum, r) => sum + r.bookings, 0);
    const totalCheckins = rows.reduce((sum, r) => sum + r.checkins, 0);
    const totalClients = rows.reduce((sum, r) => sum + r.total_clients, 0);
    const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    const totalWash = rows.reduce((sum, r) => sum + r.wash, 0);
    const checkinRate = totalClients > 0 ? Math.round((totalCheckins / totalClients) * 100) : 0;

    const cfg = staffKpiConfigMap.get(person.id) || kpiConfig[person.type];
    const checks = {
      bookings: totalBookings >= cfg.monthlyBookings,
      checkin: checkinRate >= cfg.monthlyCheckinRate
    };

    if (person.type === "assistant") {
      checks.wash = totalWash >= cfg.weeklyWash * 4;
      checks.revenue = totalRevenue >= cfg.monthlyRevenue;
    }

    const allPass = Object.values(checks).every(Boolean);
    return { ...person, totalBookings, totalRevenue, totalWash, checkinRate, checks, allPass };
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

module.exports = { calculateKpiByStaff, calculateSalaryReport };
