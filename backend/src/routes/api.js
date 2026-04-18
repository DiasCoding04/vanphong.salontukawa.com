const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const { all, get, run } = require("../config/db");
const { calculateKpiByStaff, calculateKpiWeekByStaff, calculateSalaryReport } = require("../services/reportService");

const router = express.Router();

const CCCD_UPLOAD_DIR = path.join(__dirname, "../../data/uploads/cccd");

const uploadCccd = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(CCCD_UPLOAD_DIR, { recursive: true });
      cb(null, CCCD_UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
      const staffId = String(req.body.staffId || "0").replace(/\D/g, "") || "0";
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ? ext : ".jpg";
      cb(null, `cccd-${staffId}-${crypto.randomUUID()}${safeExt}`);
    }
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype || "");
    cb(ok ? null : new Error("Chỉ cho phép ảnh JPEG, PNG, WebP hoặc GIF."), ok);
  }
});

function extToMime(ext) {
  switch (ext) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

function mapPersonalInfoRow(row) {
  return {
    staffId: row.staff_id,
    phone: row.phone || "",
    nationalId: row.national_id || "",
    birthDate: row.birth_date || "",
    hometown: row.hometown || "",
    hasCccdImage: Boolean(row.cccd_image_filename)
  };
}

function parseMonthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const toDate = new Date(y, m, 0);
  const to = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`;
  return { from, to };
}

function normalizeStaffStatus(status) {
  if (status === "active") return "working";
  if (status === "inactive") return "left";
  return status || "working";
}

function overlapsEmploymentClause(fromField, toField) {
  return `s.start_date <= ${toField} AND (s.end_date IS NULL OR s.end_date = '' OR s.end_date >= ${fromField})`;
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
    status: normalizeStaffStatus(row.status),
    startDate: row.start_date,
    endDate: row.end_date || null
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
    const { name, type, branchId, baseSalary, accountNumber, holdRemaining, status, startDate, endDate } = req.body;
    const normalizedStatus = normalizeStaffStatus(status);
    if (normalizedStatus === "left" && !endDate) {
      return res.status(400).json({ message: "endDate is required when status is left" });
    }
    const result = await run(
      "INSERT INTO staff (name, type, branch_id, base_salary, account_number, hold_remaining, status, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name, type, branchId, baseSalary, accountNumber || "", holdRemaining || 0, normalizedStatus, startDate, endDate || null]
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
    const { name, type, branchId, baseSalary, accountNumber, holdRemaining, status, startDate, endDate } = req.body;
    const normalizedStatus = normalizeStaffStatus(status);
    if (normalizedStatus === "left" && !endDate) {
      return res.status(400).json({ message: "endDate is required when status is left" });
    }
    await run(
      `UPDATE staff SET name = ?, type = ?, branch_id = ?, base_salary = ?, account_number = ?, hold_remaining = ?, status = ?, start_date = ?, end_date = ? WHERE id = ?`,
      [name, type, branchId, baseSalary, accountNumber || "", holdRemaining || 0, normalizedStatus, startDate, endDate || null, id]
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
    const { date, month, branchId, from, to } = req.query;
    let query = `
      SELECT a.* FROM attendance a
      JOIN staff s ON s.id = a.staff_id
      WHERE 1 = 1
    `;
    const params = [];
    if (from && to) {
      query += " AND a.date >= ? AND a.date <= ?";
      params.push(from, to);
    } else if (date) {
      query += " AND a.date = ?";
      params.push(date);
    } else if (month) {
      const { from, to } = parseMonthRange(month);
      query += " AND a.date >= ? AND a.date <= ?";
      params.push(from, to);
    }
    if (branchId) {
      query += " AND s.branch_id = ?";
      params.push(branchId);
    }
    query += " AND a.date >= s.start_date AND (s.end_date IS NULL OR s.end_date = '' OR a.date <= s.end_date)";
    query += " ORDER BY a.date DESC, a.staff_id";
    const rows = await all(query, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

function parseAttendancePresence(body) {
  if (body.presenceStatus === "absent" || body.presenceStatus === "present" || body.presenceStatus === "late") {
    return body.presenceStatus;
  }
  if (body.present === false || body.present === 0) return "absent";
  return "present";
}

function formatViDateFromIso(iso) {
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function isEmployedOnDate(staff, isoDate) {
  if (staff.start_date && staff.start_date > isoDate) return false;
  if (staff.end_date && staff.end_date < isoDate) return false;
  return true;
}

router.put("/attendance", async (req, res, next) => {
  try {
    const {
      staffId,
      date,
      totalClients,
      checkins,
      products,
      chemicalBookings: rawChemical,
      washBookings: rawWash,
      lateMinutes: bodyLateMin,
      latePenalty: bodyLatePenalty
    } = req.body;
    const presenceStatus = parseAttendancePresence(req.body);
    const staff = await get("SELECT type, start_date, end_date FROM staff WHERE id = ?", [staffId]);
    if (!staff) return res.status(404).json({ message: "Staff not found" });
    if (date < staff.start_date || (staff.end_date && date > staff.end_date)) {
      return res.status(400).json({ message: "Attendance date is outside employment range" });
    }

    const chemicalBookings = Array.isArray(rawChemical) ? rawChemical : null;
    const washBookings = Array.isArray(rawWash) ? rawWash : null;
    if (chemicalBookings === null || washBookings === null) {
      return res.status(400).json({ message: "Thiếu chemicalBookings hoặc washBookings" });
    }

    let absent = presenceStatus === "absent";
    const hasAnyChemicalBooking = chemicalBookings.length > 0;
    const hasAnyWashBooking = staff.type === "assistant" && washBookings.length > 0;
    if (absent && (hasAnyChemicalBooking || hasAnyWashBooking)) {
      absent = false;
    }
    const late = presenceStatus === "late";

    let lateMinutes = null;
    let latePenalty = null;
    if (late) {
      lateMinutes = Math.round(Number(bodyLateMin));
      latePenalty = Math.round(Number(bodyLatePenalty));
      if (!Number.isFinite(lateMinutes) || lateMinutes < 0) {
        return res.status(400).json({ message: "Số phút đi muộn không hợp lệ" });
      }
      if (!Number.isFinite(latePenalty) || latePenalty < 0) {
        return res.status(400).json({ message: "Số tiền phạt đi muộn không hợp lệ" });
      }
    }

    const present = absent ? 0 : 1;

    const CHEMICAL_MIN_VND = 450000;
    /** Mỗi dòng gội có doanh thu từ mức này trở lên được tính 2 lịch (thay vì 1). */
    const WASH_DOUBLE_COUNT_FROM_VND = 350000;
    const chemical = chemicalBookings.map((b) => ({ revenue: Math.round(Number(b.revenue)) }));
    const washLines = staff.type === "assistant" ? washBookings.map((b) => ({ revenue: Math.round(Number(b.revenue)) })) : [];

    for (const b of chemical) {
      if (!Number.isFinite(b.revenue) || b.revenue < CHEMICAL_MIN_VND) {
        return res.status(400).json({
          message: "Mỗi lịch đặt hóa chất phải có doanh thu từ 450.000 VND trở lên (≥ 450.000 VND)"
        });
      }
    }
    if (staff.type === "assistant") {
      for (const b of washLines) {
        if (!Number.isFinite(b.revenue) || b.revenue <= 0) {
          return res.status(400).json({
            message: "Mỗi lịch đặt gội phải có doanh thu lớn hơn 0 VND."
          });
        }
      }
    }

    const bookings = chemical.length;
    const wash =
      staff.type === "assistant"
        ? washLines.reduce((sum, b) => sum + (b.revenue >= WASH_DOUBLE_COUNT_FROM_VND ? 2 : 1), 0)
        : 0;
    const revenue = [...chemical, ...washLines].reduce((s, b) => s + b.revenue, 0);
    const chemicalJson = JSON.stringify(chemical);
    const washJson = JSON.stringify(washLines);

    await run(
      `INSERT INTO attendance (staff_id, date, present, bookings, total_clients, checkins, products, revenue, wash, chemical_bookings_json, wash_bookings_json, late_minutes, late_penalty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(staff_id, date) DO UPDATE SET
         present=excluded.present,
         bookings=excluded.bookings,
         total_clients=excluded.total_clients,
         checkins=excluded.checkins,
         products=excluded.products,
         revenue=excluded.revenue,
         wash=excluded.wash,
         chemical_bookings_json=excluded.chemical_bookings_json,
         wash_bookings_json=excluded.wash_bookings_json,
         late_minutes=excluded.late_minutes,
         late_penalty=excluded.late_penalty`,
      [
        staffId,
        date,
        present ? 1 : 0,
        bookings,
        totalClients || 0,
        checkins || 0,
        products || 0,
        revenue,
        wash,
        chemicalJson,
        washJson,
        late ? lateMinutes : null,
        late ? latePenalty : null
      ]
    );
    const row = await get("SELECT * FROM attendance WHERE staff_id = ? AND date = ?", [staffId, date]);
    await run("DELETE FROM salary_adjustments WHERE attendance_id = ?", [row.id]);
    if (late && latePenalty > 0) {
      const month = date.slice(0, 7);
      const note = `Đi muộn ${formatViDateFromIso(date)}: ${lateMinutes} phút`;
      await run(
        `INSERT INTO salary_adjustments (staff_id, month, type, amount, note, attendance_id) VALUES (?, ?, 'penalty', ?, ?, ?)`,
        [staffId, month, latePenalty, note, row.id]
      );
    }
    const rowOut = await get("SELECT * FROM attendance WHERE staff_id = ? AND date = ?", [staffId, date]);
    res.json(rowOut);
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

/** Nhân viên được gán chạy KPI quản lí (theo chi nhánh). */
router.get("/manager-kpi-staff", async (req, res, next) => {
  try {
    const { branchId } = req.query;
    if (!branchId) return res.status(400).json({ message: "branchId is required" });
    const rows = await all(
      `SELECT s.id, s.name, s.type
       FROM manager_kpi_staff m
       JOIN staff s ON s.id = m.staff_id
       WHERE s.branch_id = ?
       ORDER BY s.name`,
      [branchId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post("/manager-kpi-staff", async (req, res, next) => {
  try {
    const { staffId, branchId } = req.body;
    if (!staffId || branchId == null || branchId === "") {
      return res.status(400).json({ message: "staffId and branchId are required" });
    }
    const staff = await get("SELECT id, branch_id FROM staff WHERE id = ?", [staffId]);
    if (!staff) return res.status(404).json({ message: "Staff not found" });
    if (Number(staff.branch_id) !== Number(branchId)) {
      return res.status(400).json({ message: "Nhân viên không thuộc chi nhánh đang chọn" });
    }
    await run("INSERT OR IGNORE INTO manager_kpi_staff (staff_id) VALUES (?)", [staffId]);
    const row = await get("SELECT id, name, type FROM staff WHERE id = ?", [staffId]);
    res.status(201).json(row);
  } catch (error) {
    next(error);
  }
});

router.delete("/manager-kpi-staff/:staffId", async (req, res, next) => {
  try {
    await run("DELETE FROM manager_kpi_staff WHERE staff_id = ?", [req.params.staffId]);
    res.status(204).send();
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

router.get("/staff-personal-info", async (req, res, next) => {
  try {
    const { branchId, staffId } = req.query;
    let query = `
      SELECT spi.staff_id, spi.phone, spi.national_id, spi.birth_date, spi.hometown, spi.cccd_image_filename
      FROM staff_personal_info spi
      JOIN staff s ON s.id = spi.staff_id
      WHERE 1 = 1
    `;
    const params = [];
    if (branchId) {
      query += " AND s.branch_id = ?";
      params.push(branchId);
    }
    if (staffId) {
      query += " AND spi.staff_id = ?";
      params.push(staffId);
    }
    query += " ORDER BY spi.staff_id";
    const rows = await all(query, params);
    res.json(rows.map(mapPersonalInfoRow));
  } catch (error) {
    next(error);
  }
});

router.get("/staff-personal-info/cccd-image/:staffId", async (req, res, next) => {
  try {
    const staffId = Number(req.params.staffId);
    if (!Number.isFinite(staffId)) return res.status(400).send("Bad request");
    const row = await get("SELECT cccd_image_filename FROM staff_personal_info WHERE staff_id = ?", [staffId]);
    if (!row?.cccd_image_filename) return res.status(404).send("Not found");
    const resolved = path.resolve(CCCD_UPLOAD_DIR, row.cccd_image_filename);
    const base = path.resolve(CCCD_UPLOAD_DIR);
    if (!resolved.startsWith(base)) return res.status(400).send("Bad path");
    if (!fs.existsSync(resolved)) return res.status(404).send("Missing file");
    const ext = path.extname(resolved).toLowerCase();
    res.setHeader("Content-Type", extToMime(ext));
    res.sendFile(resolved);
  } catch (error) {
    next(error);
  }
});

router.post("/staff-personal-info/cccd-upload", (req, res, next) => {
  uploadCccd.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ message: String(err.message || err) });
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "file is required" });
    const staffId = Number(req.body.staffId);
    if (!Number.isFinite(staffId)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
      return res.status(400).json({ message: "staffId is required" });
    }
    const staff = await get("SELECT id FROM staff WHERE id = ?", [staffId]);
    if (!staff) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
      return res.status(404).json({ message: "Staff not found" });
    }

    const newName = path.basename(req.file.path);
    const prev = await get("SELECT cccd_image_filename FROM staff_personal_info WHERE staff_id = ?", [staffId]);
    if (prev?.cccd_image_filename) {
      const oldPath = path.resolve(CCCD_UPLOAD_DIR, path.basename(prev.cccd_image_filename));
      if (oldPath.startsWith(path.resolve(CCCD_UPLOAD_DIR))) {
        try {
          fs.unlinkSync(oldPath);
        } catch (_) {}
      }
    }

    const existing = await get("SELECT staff_id FROM staff_personal_info WHERE staff_id = ?", [staffId]);
    if (!existing) {
      await run("INSERT INTO staff_personal_info (staff_id, cccd_image_filename) VALUES (?, ?)", [staffId, newName]);
    } else {
      await run("UPDATE staff_personal_info SET cccd_image_filename = ? WHERE staff_id = ?", [newName, staffId]);
    }

    const saved = await get(
      "SELECT staff_id, phone, national_id, birth_date, hometown, cccd_image_filename FROM staff_personal_info WHERE staff_id = ?",
      [staffId]
    );
    res.status(201).json(mapPersonalInfoRow(saved));
  } catch (error) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
    }
    next(error);
  }
});

router.put("/staff-personal-info", async (req, res, next) => {
  try {
    const { staffId, phone, nationalId, birthDate, hometown } = req.body;
    if (!staffId) return res.status(400).json({ message: "staffId is required" });
    const nationalTrim = String(nationalId || "").trim();
    const birthTrim = String(birthDate || "").trim();
    if (!nationalTrim) return res.status(400).json({ message: "nationalId (CCCD) is required" });
    if (!birthTrim) return res.status(400).json({ message: "birthDate is required" });
    const birthMatch = birthTrim.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!birthMatch) return res.status(400).json({ message: "birthDate must be DD/MM/YYYY" });
    const d = Number(birthMatch[1]);
    const m = Number(birthMatch[2]);
    const y = Number(birthMatch[3]);
    if (m < 1 || m > 12 || y < 1900 || y > 2100) {
      return res.status(400).json({ message: "birthDate is invalid" });
    }
    const maxDay = new Date(y, m, 0).getDate();
    if (d < 1 || d > maxDay) return res.status(400).json({ message: "birthDate is invalid" });

    const staff = await get("SELECT id FROM staff WHERE id = ?", [staffId]);
    if (!staff) return res.status(404).json({ message: "Staff not found" });

    await run(
      `INSERT INTO staff_personal_info (staff_id, phone, national_id, birth_date, hometown)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(staff_id) DO UPDATE SET
         phone = excluded.phone,
         national_id = excluded.national_id,
         birth_date = excluded.birth_date,
         hometown = excluded.hometown`,
      [staffId, phone || "", nationalTrim, birthTrim, hometown || ""]
    );
    const saved = await get(
      "SELECT staff_id, phone, national_id, birth_date, hometown, cccd_image_filename FROM staff_personal_info WHERE staff_id = ?",
      [staffId]
    );
    res.json(mapPersonalInfoRow(saved));
  } catch (error) {
    next(error);
  }
});

router.post("/salary-adjustments", async (req, res, next) => {
  try {
    const { staffId, month, type, amount, note, attendanceId, dailyReportId } = req.body;
    const result = await run(
      "INSERT INTO salary_adjustments (staff_id, month, type, amount, note, attendance_id, daily_report_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [staffId, month, type, amount, note || null, attendanceId ?? null, dailyReportId ?? null]
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
    const { month, staffId, type } = req.query;
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
    if (type) {
      query += " AND type = ?";
      params.push(type);
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
    const { from, to } = parseMonthRange(month);
    const staffRows = branchId
      ? await all(
          `SELECT * FROM staff s
           WHERE s.branch_id = ? AND ${overlapsEmploymentClause("?", "?")}
           ORDER BY s.id`,
          [branchId, to, from]
        )
      : await all(`SELECT * FROM staff s WHERE ${overlapsEmploymentClause("?", "?")} ORDER BY s.id`, [to, from]);
    const attendanceRows = await all(
      `SELECT a.* FROM attendance a
       JOIN staff s ON s.id = a.staff_id
       WHERE a.date >= ? AND a.date <= ?
         ${branchId ? "AND s.branch_id = ?" : ""}
         AND a.date >= s.start_date
         AND (s.end_date IS NULL OR s.end_date = '' OR a.date <= s.end_date)`,
      branchId ? [from, to, branchId] : [from, to]
    );
    const kpiConfig = JSON.parse((await get("SELECT config_json FROM kpi_config WHERE id = 1")).config_json);
    const staffKpiMap = await getStaffKpiMap(month, staffRows);
    const data = calculateKpiByStaff(staffRows, attendanceRows, kpiConfig, staffKpiMap);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/reports/kpi-week", async (req, res, next) => {
  try {
    const { from, to, branchId } = req.query;
    if (!from || !to) {
      return res.status(400).json({ message: "Query from and to (YYYY-MM-DD) are required" });
    }
    /* Tổng chỉ số = đúng [from, to] (cả tuần). KPI tuần độc lập KPI tháng: không dùng tháng của `to`
     * (Chủ nhật) để nạp staff_kpi_settings — khi tuần cắt 2 tháng, neo theo tháng chứa Thứ Hai (`from`). */
    const staffKpiLookupMonth = from.slice(0, 7);
    const staffRows = branchId
      ? await all(
          `SELECT * FROM staff s
           WHERE s.branch_id = ? AND ${overlapsEmploymentClause("?", "?")}
           ORDER BY s.id`,
          [branchId, to, from]
        )
      : await all(`SELECT * FROM staff s WHERE ${overlapsEmploymentClause("?", "?")} ORDER BY s.id`, [to, from]);
    const attendanceRows = await all(
      `SELECT a.* FROM attendance a
       JOIN staff s ON s.id = a.staff_id
       WHERE a.date >= ? AND a.date <= ?
         ${branchId ? "AND s.branch_id = ?" : ""}
         AND a.date >= s.start_date
         AND (s.end_date IS NULL OR s.end_date = '' OR a.date <= s.end_date)`,
      branchId ? [from, to, branchId] : [from, to]
    );
    const kpiConfig = JSON.parse((await get("SELECT config_json FROM kpi_config WHERE id = 1")).config_json);
    const staffKpiMap = await getStaffKpiMap(staffKpiLookupMonth, staffRows);
    const data = calculateKpiWeekByStaff(staffRows, attendanceRows, kpiConfig, staffKpiMap);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/reports/salary", async (req, res, next) => {
  try {
    const { month, branchId } = req.query;
    const { from, to } = parseMonthRange(month);
    const staffRows = branchId
      ? await all(
          `SELECT * FROM staff s
           WHERE s.branch_id = ? AND ${overlapsEmploymentClause("?", "?")}
           ORDER BY s.id`,
          [branchId, to, from]
        )
      : await all(`SELECT * FROM staff s WHERE ${overlapsEmploymentClause("?", "?")} ORDER BY s.id`, [to, from]);
    const attendanceRows = await all(
      `SELECT a.* FROM attendance a
       JOIN staff s ON s.id = a.staff_id
       WHERE a.date >= ? AND a.date <= ?
         ${branchId ? "AND s.branch_id = ?" : ""}
         AND a.date >= s.start_date
         AND (s.end_date IS NULL OR s.end_date = '' OR a.date <= s.end_date)`,
      branchId ? [from, to, branchId] : [from, to]
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

    const { from, to } = parseMonthRange(month);
    const staffRows = branchId
      ? await all(
          `SELECT * FROM staff s
           WHERE s.branch_id = ? AND ${overlapsEmploymentClause("?", "?")}
           ORDER BY s.id`,
          [branchId, to, from]
        )
      : await all(`SELECT * FROM staff s WHERE ${overlapsEmploymentClause("?", "?")} ORDER BY s.id`, [to, from]);
    const attendanceRows = await all(
      `SELECT a.* FROM attendance a
       JOIN staff s ON s.id = a.staff_id
       WHERE a.date >= ? AND a.date <= ?
         ${branchId ? "AND s.branch_id = ?" : ""}
         AND a.date >= s.start_date
         AND (s.end_date IS NULL OR s.end_date = '' OR a.date <= s.end_date)`,
      branchId ? [from, to, branchId] : [from, to]
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

router.get("/daily-reports", async (req, res, next) => {
  try {
    const { date, branchId } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ message: "date (YYYY-MM-DD) is required" });
    }
    if (branchId == null || branchId === "") {
      return res.status(400).json({ message: "branchId is required" });
    }

    const staffRows = await all(
      `SELECT * FROM staff WHERE branch_id = ? AND status = 'working' ORDER BY name`,
      [branchId]
    );
    const filtered = staffRows.filter((s) => isEmployedOnDate(s, date));
    const reports = await all("SELECT * FROM daily_reports WHERE report_date = ?", [date]);
    const byStaff = new Map(reports.map((r) => [r.staff_id, r]));

    res.json(
      filtered.map((s) => {
        const r = byStaff.get(s.id);
        return {
          staffId: s.id,
          name: s.name,
          type: s.type,
          report: r
            ? {
                id: r.id,
                workStatus: r.work_status,
                workPenalty: r.work_penalty,
                videoStatus: r.video_status,
                videoPenalty: r.video_penalty
              }
            : null
        };
      })
    );
  } catch (error) {
    next(error);
  }
});

router.put("/daily-reports", async (req, res, next) => {
  try {
    const { reportDate, branchId, items } = req.body;
    if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(reportDate))) {
      return res.status(400).json({ message: "reportDate (YYYY-MM-DD) is required" });
    }
    if (branchId == null || branchId === "") {
      return res.status(400).json({ message: "branchId is required" });
    }
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "items array is required" });
    }

    const month = String(reportDate).slice(0, 7);

    for (const item of items) {
      const { staffId, workStatus, workPenalty, videoStatus, videoPenalty } = item;
      if (!staffId) {
        return res.status(400).json({ message: "each item needs staffId" });
      }
      if (!["reported", "not_reported"].includes(workStatus)) {
        return res.status(400).json({ message: "invalid workStatus" });
      }
      if (!["posted", "not_posted"].includes(videoStatus)) {
        return res.status(400).json({ message: "invalid videoStatus" });
      }

      const st = await get("SELECT id, branch_id, start_date, end_date FROM staff WHERE id = ?", [staffId]);
      if (!st || st.branch_id !== Number(branchId)) {
        return res.status(400).json({ message: "staff not in branch" });
      }
      if (!isEmployedOnDate(st, reportDate)) {
        return res.status(400).json({ message: "date outside employment range" });
      }

      let wp = null;
      if (workStatus === "not_reported") {
        if (workPenalty !== "" && workPenalty != null && workPenalty !== undefined) {
          wp = Math.round(Number(workPenalty));
          if (!Number.isFinite(wp) || wp < 0) {
            return res.status(400).json({ message: "workPenalty invalid" });
          }
        }
      }

      let vp = null;
      if (videoStatus === "not_posted") {
        if (videoPenalty !== "" && videoPenalty != null && videoPenalty !== undefined) {
          vp = Math.round(Number(videoPenalty));
          if (!Number.isFinite(vp) || vp < 0) {
            return res.status(400).json({ message: "videoPenalty invalid" });
          }
        }
      }

      await run(
        `INSERT INTO daily_reports (staff_id, report_date, work_status, work_penalty, video_status, video_penalty)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(staff_id, report_date) DO UPDATE SET
           work_status = excluded.work_status,
           work_penalty = excluded.work_penalty,
           video_status = excluded.video_status,
           video_penalty = excluded.video_penalty`,
        [staffId, reportDate, workStatus, wp, videoStatus, vp]
      );

      const dr = await get("SELECT id FROM daily_reports WHERE staff_id = ? AND report_date = ?", [staffId, reportDate]);
      await run("DELETE FROM salary_adjustments WHERE daily_report_id = ?", [dr.id]);

      const viNote = formatViDateFromIso(reportDate);
      if (workStatus === "not_reported" && wp != null && wp > 0) {
        await run(
          `INSERT INTO salary_adjustments (staff_id, month, type, amount, note, attendance_id, daily_report_id)
           VALUES (?, ?, 'penalty', ?, ?, NULL, ?)`,
          [staffId, month, wp, `Báo cáo công việc (${viNote}): không báo cáo`, dr.id]
        );
      }
      if (videoStatus === "not_posted" && vp != null && vp > 0) {
        await run(
          `INSERT INTO salary_adjustments (staff_id, month, type, amount, note, attendance_id, daily_report_id)
           VALUES (?, ?, 'penalty', ?, ?, NULL, ?)`,
          [staffId, month, vp, `Báo cáo video (${viNote}): không đăng`, dr.id]
        );
      }
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
