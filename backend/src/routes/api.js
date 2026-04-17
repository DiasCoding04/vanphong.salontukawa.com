const express = require("express");
const { all, get, run } = require("../config/db");
const { calculateKpiByStaff, calculateSalaryReport } = require("../services/reportService");

const router = express.Router();

function toStaffDto(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    branchId: row.branch_id,
    baseSalary: row.base_salary,
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
    const { name, type, branchId, baseSalary, status, startDate } = req.body;
    const result = await run(
      "INSERT INTO staff (name, type, branch_id, base_salary, status, start_date) VALUES (?, ?, ?, ?, ?, ?)",
      [name, type, branchId, baseSalary, status || "active", startDate]
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
    const { name, type, branchId, baseSalary, status, startDate } = req.body;
    await run(
      `UPDATE staff SET name = ?, type = ?, branch_id = ?, base_salary = ?, status = ?, start_date = ? WHERE id = ?`,
      [name, type, branchId, baseSalary, status, startDate, id]
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
    const data = calculateKpiByStaff(staffRows, attendanceRows, kpiConfig);
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
    const kpiRows = calculateKpiByStaff(staffRows, attendanceRows, kpiConfig);
    const salaries = calculateSalaryReport(staffRows, attendanceRows, kpiRows, adjustments, kpiConfig);
    res.json(salaries);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
