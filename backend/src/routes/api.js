const express = require("express");
const { all, get, run } = require("../config/db");
const { calculateKpiByStaff, calculateSalaryReport } = require("../services/reportService");

const router = express.Router();

function parseMonthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const toDate = new Date(y, m, 0);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;
  return { from, to };
}

async function getStaffKpiMap(month, staffRows) {
  if (!month || staffRows.length === 0) return new Map();
  const { from, to } = parseMonthRange(month);
  const ids = staffRows.map((s) => s.id);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await all(
    `SELECT * FROM staff_kpi_settings
     WHERE staff_id IN (${placeholders})
       AND start_date <= ?
       AND (end_date IS NULL OR end_date = '' OR end_date >= ?)`,
    [...ids, to, from]
  );
  const map = new Map();
  for (const row of rows) {
    map.set(row.staff_id, JSON.parse(row.config_json));
  }
  return map;
}

async function getHoldHistoryMap(month, staffRows) {
  if (!month || staffRows.length === 0) return new Map();
  const ids = staffRows.map((s) => s.id);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await all(
    `SELECT staff_id, month, amount
     FROM hold_deductions
     WHERE staff_id IN (${placeholders}) AND month <= ?`,
    [...ids, month]
  );

  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.staff_id)) {
      map.set(row.staff_id, { deductedBefore: 0, deductedCurrent: null });
    }
    const state = map.get(row.staff_id);
    if (row.month < month) state.deductedBefore += row.amount;
    if (row.month === month) state.deductedCurrent = row.amount;
  }
  return map;
}

function toStaffDto(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    branchId: row.branch_id,
    baseSalary: row.base_salary,
    accountNumber: row.account_number || "",
    holdRemaining: row.hold_remaining || 0,
    status: row.status,
    startDate: row.start_date
  };
}

router.get("/health", (_, res) => res.json({ ok: true }));

router.get("/branches", async (_, res, next) => {
  try {
    const rows = await all("SELECT id, name FROM branches ORDER BY id");
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post("/branches", async (req, res, next) => {
  try {
    const { name } = req.body;
    const result = await run("INSERT INTO branches (name) VALUES (?)", [name]);
    const created = await get("SELECT id, name FROM branches WHERE id = ?", [result.id]);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/branches/:id", async (req, res, next) => {
  try {
    await run("UPDATE branches SET name = ? WHERE id = ?", [req.body.name, req.params.id]);
    const updated = await get("SELECT id, name FROM branches WHERE id = ?", [req.params.id]);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/branches/:id", async (req, res, next) => {
  try {
    const hasStaff = await get("SELECT COUNT(*) AS total FROM staff WHERE branch_id = ?", [req.params.id]);
    if (hasStaff.total > 0) return res.status(400).json({ message: "Branch has staff" });
    await run("DELETE FROM branches WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/staff", async (req, res, next) => {
  try {
    const { branchId } = req.query;
    const rows = branchId
      ? await all("SELECT * FROM staff WHERE branch_id = ? ORDER BY id", [branchId])
      : await all("SELECT * FROM staff ORDER BY id");
    res.json(rows.map(toStaffDto));
  } catch (error) {
    next(error);
  }
});

router.post("/staff", async (req, res, next) => {
  try {
    const { name, type, branchId, baseSalary, accountNumber, holdRemaining, status, startDate } = req.body;
    const result = await run(
      "INSERT INTO staff (name, type, branch_id, base_salary, account_number, hold_remaining, status, start_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, type, branchId, baseSalary, accountNumber || "", holdRemaining || 0, status || "active", startDate]
    );
    const created = await get("SELECT * FROM staff WHERE id = ?", [result.id]);
    res.status(201).json(toStaffDto(created));
  } catch (error) {
    next(error);
  }
});

router.put("/staff/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type, branchId, baseSalary, accountNumber, holdRemaining, status, startDate } = req.body;
    await run(
      `UPDATE staff SET name = ?, type = ?, branch_id = ?, base_salary = ?, account_number = ?, hold_remaining = ?, status = ?, start_date = ? WHERE id = ?`,
      [name, type, branchId, baseSalary, accountNumber || "", holdRemaining || 0, status, startDate, id]
    );
    const updated = await get("SELECT * FROM staff WHERE id = ?", [id]);
    res.json(toStaffDto(updated));
  } catch (error) {
    next(error);
  }
});

router.delete("/staff/:id", async (req, res, next) => {
  try {
    await run("DELETE FROM staff WHERE id = ?", [req.params.id]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/attendance", async (req, res, next) => {
  try {
    const { date, month, branchId } = req.query;
    let query = `
      SELECT a.* FROM attendance a
      JOIN staff s ON s.id = a.staff_id
      WHERE 1 = 1
    `;
    const params = [];
    if (date) {
      query += " AND a.date = ?";
      params.push(date);
    }
    if (month) {
      query += " AND a.date LIKE ?";
      params.push(`${month}%`);
    }
    if (branchId) {
      query += " AND s.branch_id = ?";
      params.push(branchId);
    }
    query += " ORDER BY a.date DESC, a.staff_id";
    const rows = await all(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.put("/attendance", async (req, res, next) => {
  try {
    const { staffId, date, present, bookings, totalClients, checkins, products, revenue, wash } = req.body;
    await run(
      `INSERT INTO attendance (staff_id, date, present, bookings, total_clients, checkins, products, revenue, wash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(staff_id, date) DO UPDATE SET
         present=excluded.present,
         bookings=excluded.bookings,
         total_clients=excluded.total_clients,
         checkins=excluded.checkins,
         products=excluded.products,
         revenue=excluded.revenue,
         wash=excluded.wash`,
      [staffId, date, present ? 1 : 0, bookings || 0, totalClients || 0, checkins || 0, products || 0, revenue || 0, wash || 0]
    );
    const row = await get("SELECT * FROM attendance WHERE staff_id = ? AND date = ?", [staffId, date]);
    res.json(row);
  } catch (error) {
    next(error);
  }
});

router.get("/kpi-config", async (_, res, next) => {
  try {
    const row = await get("SELECT config_json FROM kpi_config WHERE id = 1");
    res.json(JSON.parse(row.config_json));
  } catch (error) {
    next(error);
  }
});

router.put("/kpi-config", async (req, res, next) => {
  try {
    await run("UPDATE kpi_config SET config_json = ? WHERE id = 1", [JSON.stringify(req.body)]);
    res.json(req.body);
  } catch (error) {
    next(error);
  }
});

router.get("/staff-kpi-settings", async (req, res, next) => {
  try {
    const { staffId } = req.query;
    if (!staffId) return res.status(400).json({ message: "staffId is required" });
    const row = await get("SELECT * FROM staff_kpi_settings WHERE staff_id = ?", [staffId]);
    if (!row) return res.json(null);
    res.json({
      staffId: row.staff_id,
      startDate: row.start_date,
      endDate: row.end_date,
      config: JSON.parse(row.config_json)
    });
  } catch (error) {
    next(error);
  }
});

router.put("/staff-kpi-settings", async (req, res, next) => {
  try {
    const { staffId, startDate, endDate, config } = req.body;
    await run(
      `INSERT INTO staff_kpi_settings (staff_id, start_date, end_date, config_json)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(staff_id) DO UPDATE SET
         start_date = excluded.start_date,
         end_date = excluded.end_date,
         config_json = excluded.config_json`,
      [staffId, startDate, endDate || null, JSON.stringify(config)]
    );
    const row = await get("SELECT * FROM staff_kpi_settings WHERE staff_id = ?", [staffId]);
    res.json({
      staffId: row.staff_id,
      startDate: row.start_date,
      endDate: row.end_date,
      config: JSON.parse(row.config_json)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/salary-adjustments", async (req, res, next) => {
  try {
    const { staffId, month, type, amount, note } = req.body;
    const result = await run(
      "INSERT INTO salary_adjustments (staff_id, month, type, amount, note) VALUES (?, ?, ?, ?, ?)",
      [staffId, month, type, amount, note || null]
    );
    const row = await get("SELECT * FROM salary_adjustments WHERE id = ?", [result.id]);
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

router.put("/salary-adjustments/bulk", async (req, res, next) => {
  try {
    const { staffId, month, commission = 0, booking8 = 0, kpibonus = 0 } = req.body;
    await run(
      `DELETE FROM salary_adjustments
       WHERE staff_id = ? AND month = ? AND type IN ('commission', 'booking8', 'kpibonus')`,
      [staffId, month]
    );
    await run(
      `INSERT INTO salary_adjustments (staff_id, month, type, amount)
       VALUES (?, ?, 'commission', ?), (?, ?, 'booking8', ?), (?, ?, 'kpibonus', ?)`,
      [staffId, month, commission, staffId, month, booking8, staffId, month, kpibonus]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/salary-adjustments", async (req, res, next) => {
  try {
    const { month, staffId } = req.query;
    let query = "SELECT * FROM salary_adjustments WHERE 1=1";
    const params = [];
    if (month) {
      query += " AND month = ?";
      params.push(month);
    }
    if (staffId) {
      query += " AND staff_id = ?";
      params.push(staffId);
    }
    query += " ORDER BY id DESC";
    const rows = await all(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/reports/kpi", async (req, res, next) => {
  try {
    const { month, branchId } = req.query;
    const staffRows = branchId
      ? await all("SELECT * FROM staff WHERE branch_id = ? AND status = 'active' ORDER BY id", [branchId])
      : await all("SELECT * FROM staff WHERE status = 'active' ORDER BY id");
    const attendanceRows = await all(
      `SELECT a.* FROM attendance a
       JOIN staff s ON s.id = a.staff_id
       WHERE a.date LIKE ? ${branchId ? "AND s.branch_id = ?" : ""}`,
      branchId ? [`${month}%`, branchId] : [`${month}%`]
    );
    const kpiConfig = JSON.parse((await get("SELECT config_json FROM kpi_config WHERE id = 1")).config_json);
    const staffKpiMap = await getStaffKpiMap(month, staffRows);
    const data = calculateKpiByStaff(staffRows, attendanceRows, kpiConfig, staffKpiMap);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/reports/salary", async (req, res, next) => {
  try {
    const { month, branchId } = req.query;
    const staffRows = branchId
      ? await all("SELECT * FROM staff WHERE branch_id = ? AND status = 'active' ORDER BY id", [branchId])
      : await all("SELECT * FROM staff WHERE status = 'active' ORDER BY id");
    const attendanceRows = await all(
      `SELECT a.* FROM attendance a
       JOIN staff s ON s.id = a.staff_id
       WHERE a.date LIKE ? ${branchId ? "AND s.branch_id = ?" : ""}`,
      branchId ? [`${month}%`, branchId] : [`${month}%`]
    );
    const adjustments = await all(
      `SELECT sa.* FROM salary_adjustments sa
       JOIN staff s ON s.id = sa.staff_id
       WHERE sa.month = ? ${branchId ? "AND s.branch_id = ?" : ""}`,
      branchId ? [month, branchId] : [month]
    );
    const kpiConfig = JSON.parse((await get("SELECT config_json FROM kpi_config WHERE id = 1")).config_json);
    const staffKpiMap = await getStaffKpiMap(month, staffRows);
    const kpiRows = calculateKpiByStaff(staffRows, attendanceRows, kpiConfig, staffKpiMap);
    const holdHistoryMap = await getHoldHistoryMap(month, staffRows);
    const salaries = calculateSalaryReport(staffRows, attendanceRows, kpiRows, adjustments, kpiConfig, holdHistoryMap);
    res.json(salaries);
  } catch (error) {
    next(error);
  }
});

router.post("/hold-deductions/apply-month", async (req, res, next) => {
  try {
    const { month, branchId } = req.body;
    if (!month) return res.status(400).json({ message: "month is required" });

    const staffRows = branchId
      ? await all("SELECT * FROM staff WHERE branch_id = ? AND status = 'active' ORDER BY id", [branchId])
      : await all("SELECT * FROM staff WHERE status = 'active' ORDER BY id");
    const attendanceRows = await all(
      `SELECT a.* FROM attendance a
       JOIN staff s ON s.id = a.staff_id
       WHERE a.date LIKE ? ${branchId ? "AND s.branch_id = ?" : ""}`,
      branchId ? [`${month}%`, branchId] : [`${month}%`]
    );
    const adjustments = await all(
      `SELECT sa.* FROM salary_adjustments sa
       JOIN staff s ON s.id = sa.staff_id
       WHERE sa.month = ? ${branchId ? "AND s.branch_id = ?" : ""}`,
      branchId ? [month, branchId] : [month]
    );
    const kpiConfig = JSON.parse((await get("SELECT config_json FROM kpi_config WHERE id = 1")).config_json);
    const staffKpiMap = await getStaffKpiMap(month, staffRows);
    const holdHistoryMap = await getHoldHistoryMap(month, staffRows);
    const kpiRows = calculateKpiByStaff(staffRows, attendanceRows, kpiConfig, staffKpiMap);
    const salaries = calculateSalaryReport(staffRows, attendanceRows, kpiRows, adjustments, kpiConfig, holdHistoryMap);

    for (const row of salaries) {
      await run(
        `INSERT INTO hold_deductions (staff_id, month, amount)
         VALUES (?, ?, ?)
         ON CONFLICT(staff_id, month) DO UPDATE SET amount = excluded.amount`,
        [row.id, month, row.holdDeduction]
      );
    }
    res.json({ ok: true, totalStaff: salaries.length });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
