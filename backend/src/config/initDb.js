const { run, get, all } = require("./db");

const defaultKpiConfig = {
  weeklyStartDay: 1,
  monthlyStartDate: 1,
  kpiStartDate: "2024-01-01",
  main: {
    weeklyBookings: 20,
    weeklyCheckinRate: 80,
    monthlyBookings: 80,
    monthlyCheckinRate: 80,
    monthlyRevenue: 10000000,
    monthlyProducts: 0
  },
  assistant: {
    weeklyBookings: 15,
    weeklyCheckinRate: 75,
    weeklyWash: 30,
    monthlyBookings: 60,
    monthlyCheckinRate: 75,
    monthlyRevenue: 10000000,
    monthlyProducts: 0
  },
  chemicalMinVnd: 450000,
  washDoubleCountFromVnd: 350000,
  monthlyHoldRate: 0.15
};

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('main','assistant')),
    branch_id INTEGER NOT NULL,
    base_salary INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'working',
    start_date TEXT NOT NULL,
    end_date TEXT,
    FOREIGN KEY(branch_id) REFERENCES branches(id)
  )`);

  const staffCols = await runAndGetCols();
  if (!staffCols.includes("account_number")) {
    await run("ALTER TABLE staff ADD COLUMN account_number TEXT");
  }
  if (!staffCols.includes("hold_remaining")) {
    await run("ALTER TABLE staff ADD COLUMN hold_remaining INTEGER NOT NULL DEFAULT 0");
  }
  if (!staffCols.includes("end_date")) {
    await run("ALTER TABLE staff ADD COLUMN end_date TEXT");
  }
  await run("UPDATE staff SET status = 'working' WHERE status = 'active'");
  await run("UPDATE staff SET status = 'left' WHERE status = 'inactive'");

  await run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    present INTEGER NOT NULL DEFAULT 1,
    bookings INTEGER NOT NULL DEFAULT 0,
    total_clients INTEGER NOT NULL DEFAULT 0,
    checkins INTEGER NOT NULL DEFAULT 0,
    products INTEGER NOT NULL DEFAULT 0,
    revenue INTEGER NOT NULL DEFAULT 0,
    wash INTEGER NOT NULL DEFAULT 0,
    UNIQUE(staff_id, date),
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

  const attendanceCols = await runAndGetColsForTable("attendance");
  if (attendanceCols.length && !attendanceCols.includes("chemical_bookings_json")) {
    await run("ALTER TABLE attendance ADD COLUMN chemical_bookings_json TEXT DEFAULT '[]'");
  }
  if (attendanceCols.length && !attendanceCols.includes("wash_bookings_json")) {
    await run("ALTER TABLE attendance ADD COLUMN wash_bookings_json TEXT DEFAULT '[]'");
  }
  if (attendanceCols.length && !attendanceCols.includes("late_minutes")) {
    await run("ALTER TABLE attendance ADD COLUMN late_minutes INTEGER");
  }
  if (attendanceCols.length && !attendanceCols.includes("late_penalty")) {
    await run("ALTER TABLE attendance ADD COLUMN late_penalty INTEGER");
  }

  await run(`CREATE TABLE IF NOT EXISTS salary_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('commission','booking8','kpibonus','penalty')),
    amount INTEGER NOT NULL,
    note TEXT,
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    report_date TEXT NOT NULL,
    work_status TEXT NOT NULL CHECK(work_status IN ('reported','not_reported','late_reported')),
    work_penalty INTEGER,
    video_status TEXT NOT NULL CHECK(video_status IN ('posted','not_posted')),
    video_penalty INTEGER,
    UNIQUE(staff_id, report_date),
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

  // Migration: mở rộng CHECK(work_status) cũ ('reported','not_reported') → thêm 'late_reported'.
  // Nếu DB cũ chưa có 'late_reported' trong ràng buộc, khi UI chọn "Báo cáo muộn" sẽ lỗi CHECK constraint failed.
  const drSql = await get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='daily_reports'`);
  if (drSql && drSql.sql && !drSql.sql.includes("'late_reported'")) {
    console.log("Migrating daily_reports.work_status to allow 'late_reported'...");
    await run("BEGIN TRANSACTION");
    try {
      await run("ALTER TABLE daily_reports RENAME TO daily_reports_old");
      await run(`CREATE TABLE daily_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        report_date TEXT NOT NULL,
        work_status TEXT NOT NULL CHECK(work_status IN ('reported','not_reported','late_reported')),
        work_penalty INTEGER,
        video_status TEXT NOT NULL CHECK(video_status IN ('posted','not_posted')),
        video_penalty INTEGER,
        UNIQUE(staff_id, report_date),
        FOREIGN KEY(staff_id) REFERENCES staff(id)
      )`);
      await run(`INSERT INTO daily_reports (id, staff_id, report_date, work_status, work_penalty, video_status, video_penalty)
                 SELECT id, staff_id, report_date, work_status, work_penalty, video_status, video_penalty FROM daily_reports_old`);
      await run("DROP TABLE daily_reports_old");
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      console.error("Migration daily_reports failed:", err);
    }
  }

  const salaryAdjCols = await runAndGetColsForTable("salary_adjustments");
  if (salaryAdjCols.length && !salaryAdjCols.includes("attendance_id")) {
    await run("ALTER TABLE salary_adjustments ADD COLUMN attendance_id INTEGER REFERENCES attendance(id) ON DELETE CASCADE");
  }
  if (salaryAdjCols.length && !salaryAdjCols.includes("daily_report_id")) {
    await run("ALTER TABLE salary_adjustments ADD COLUMN daily_report_id INTEGER REFERENCES daily_reports(id) ON DELETE CASCADE");
  }

  await run(`CREATE TABLE IF NOT EXISTS hold_deductions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    UNIQUE(staff_id, month),
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS kpi_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    config_json TEXT NOT NULL
  )`);

  await run(`CREATE TABLE IF NOT EXISTS staff_kpi_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    config_json TEXT NOT NULL,
    UNIQUE(staff_id, start_date),
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

  // Migration: Kiểm tra xem bảng có đang dùng UNIQUE cũ (chỉ staff_id) không
  const indices = await all(`PRAGMA index_list('staff_kpi_settings')`);
  let needsMigration = false;
  for (const idx of indices) {
    if (idx.unique === 1) {
      const info = await all(`PRAGMA index_info('${idx.name}')`);
      // Nếu chỉ có 1 cột và cột đó là staff_id => Cần migrate
      if (info.length === 1 && info[0].name === 'staff_id') {
        needsMigration = true;
        break;
      }
    }
  }

  if (needsMigration) {
    console.log("Migrating staff_kpi_settings to support multiple dates...");
    await run("BEGIN TRANSACTION");
    try {
      await run("ALTER TABLE staff_kpi_settings RENAME TO staff_kpi_settings_old");
      await run(`CREATE TABLE staff_kpi_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        config_json TEXT NOT NULL,
        UNIQUE(staff_id, start_date),
        FOREIGN KEY(staff_id) REFERENCES staff(id)
      )`);
      await run(`INSERT INTO staff_kpi_settings (id, staff_id, start_date, end_date, config_json)
                 SELECT id, staff_id, start_date, end_date, config_json FROM staff_kpi_settings_old`);
      await run("DROP TABLE staff_kpi_settings_old");
      await run("COMMIT");
    } catch (err) {
      await run("ROLLBACK");
      console.error("Migration failed:", err);
    }
  }

  await run(`CREATE TABLE IF NOT EXISTS staff_personal_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL UNIQUE,
    phone TEXT,
    national_id TEXT,
    birth_date TEXT,
    hometown TEXT,
    cccd_image_filename TEXT,
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

  const spiCols = await runAndGetColsForTable("staff_personal_info");
  if (spiCols.length && !spiCols.includes("cccd_image_filename")) {
    await run("ALTER TABLE staff_personal_info ADD COLUMN cccd_image_filename TEXT");
  }

  const hasBranches = await get("SELECT COUNT(*) AS total FROM branches");
  if (hasBranches.total === 0) {
    // Không tự động tạo chi nhánh mẫu nữa
    console.log("Database is empty. Please create branches and staff manually.");
  }

  const hasStaff = await get("SELECT COUNT(*) AS total FROM staff");
  if (hasStaff.total === 0) {
    // Không tự động tạo nhân viên mẫu nữa
  }

  await run(`CREATE TABLE IF NOT EXISTS manager_kpi_staff (
    staff_id INTEGER PRIMARY KEY,
    FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS cross_branch_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_branch_id INTEGER NOT NULL,
    staff_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('chemical', 'wash', 'product')),
    revenue INTEGER NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_branch_id) REFERENCES branches(id),
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

  // Migration for cross_branch_bookings type CHECK constraint
  const cbTableInfo = await all(`PRAGMA table_info('cross_branch_bookings')`);
  if (cbTableInfo.length > 0) {
    const typeCol = cbTableInfo.find(c => c.name === 'type');
    // SQLite doesn't easily show the CHECK constraint in table_info. 
    // We can check the SQL used to create the table.
    const createSqlRow = await get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='cross_branch_bookings'`);
    if (createSqlRow && createSqlRow.sql && !createSqlRow.sql.includes("'product'")) {
      console.log("Migrating cross_branch_bookings to support 'product' type...");
      await run("BEGIN TRANSACTION");
      try {
        await run("ALTER TABLE cross_branch_bookings RENAME TO cross_branch_bookings_old");
        await run(`CREATE TABLE cross_branch_bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          service_branch_id INTEGER NOT NULL,
          staff_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('chemical', 'wash', 'product')),
          revenue INTEGER NOT NULL,
          note TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(service_branch_id) REFERENCES branches(id),
          FOREIGN KEY(staff_id) REFERENCES staff(id)
        )`);
        await run(`INSERT INTO cross_branch_bookings (id, service_branch_id, staff_id, date, type, revenue, note, created_at)
                   SELECT id, service_branch_id, staff_id, date, type, revenue, note, created_at FROM cross_branch_bookings_old`);
        await run("DROP TABLE cross_branch_bookings_old");
        await run("COMMIT");
      } catch (err) {
        await run("ROLLBACK");
        console.error("Migration for cross_branch_bookings failed:", err);
      }
    }
  }

  const hasKpi = await get("SELECT COUNT(*) AS total FROM kpi_config");
  if (hasKpi.total === 0) {
    await run("INSERT INTO kpi_config (id, config_json) VALUES (1, ?)", [JSON.stringify(defaultKpiConfig)]);
  }

  await run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  await run(`CREATE TABLE IF NOT EXISTS password_reset_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  await run("CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_codes (email)");

  await migrateStaffAccountNumberUnique();
}

module.exports = { initDb };

/** STK rỗng → NULL; trim; bỏ trùng (giữ id nhỏ nhất); UNIQUE toàn hệ thống. */
async function migrateStaffAccountNumberUnique() {
  const staffCols = await runAndGetCols();
  if (!staffCols.includes("account_number")) return;

  await run("UPDATE staff SET account_number = NULL WHERE account_number IS NOT NULL AND trim(account_number) = ''");
  await run("UPDATE staff SET account_number = trim(account_number) WHERE account_number IS NOT NULL");

  const rows = await all("SELECT id, account_number FROM staff WHERE account_number IS NOT NULL ORDER BY id");
  const seen = new Set();
  for (const row of rows) {
    const key = row.account_number;
    if (seen.has(key)) {
      await run("UPDATE staff SET account_number = NULL WHERE id = ?", [row.id]);
      console.warn(`[initDb] Trùng STK "${key}" — đã xóa STK tại nhân sự id ${row.id} (giữ bản ghi có id nhỏ hơn).`);
    } else {
      seen.add(key);
    }
  }

  try {
    await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_account_number_unique ON staff (account_number)");
  } catch (err) {
    console.error("[initDb] Không tạo được UNIQUE trên staff.account_number:", err.message || err);
  }
}

async function runAndGetCols() {
  const rowCols = await get("SELECT group_concat(name, ',') AS cols FROM pragma_table_info('staff')");
  return (rowCols?.cols || "").split(",").filter(Boolean);
}

async function runAndGetColsForTable(tableName) {
  const rowCols = await get(`SELECT group_concat(name, ',') AS cols FROM pragma_table_info('${tableName}')`);
  return (rowCols?.cols || "").split(",").filter(Boolean);
}
