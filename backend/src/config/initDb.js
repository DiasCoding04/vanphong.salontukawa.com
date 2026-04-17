const { run, get } = require("./db");

const defaultKpiConfig = {
  weeklyStartDay: 1,
  monthlyStartDate: 1,
  kpiStartDate: "2024-01-01",
  main: { weeklyBookings: 20, weeklyCheckinRate: 80, monthlyBookings: 80, monthlyCheckinRate: 80 },
  assistant: {
    weeklyBookings: 15,
    weeklyCheckinRate: 75,
    weeklyWash: 30,
    monthlyBookings: 60,
    monthlyCheckinRate: 75,
    monthlyRevenue: 10000000
  },
  rewards: { allPassBonus: 500000, passRate80Bonus: 200000 },
  penalties: { failKpiPenalty: 200000 }
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
    status TEXT NOT NULL DEFAULT 'active',
    start_date TEXT NOT NULL,
    FOREIGN KEY(branch_id) REFERENCES branches(id)
  )`);

  const staffCols = await runAndGetCols();
  if (!staffCols.includes("account_number")) {
    await run("ALTER TABLE staff ADD COLUMN account_number TEXT");
  }
  if (!staffCols.includes("hold_remaining")) {
    await run("ALTER TABLE staff ADD COLUMN hold_remaining INTEGER NOT NULL DEFAULT 0");
  }

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

  await run(`CREATE TABLE IF NOT EXISTS salary_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('commission','booking8','kpibonus','penalty')),
    amount INTEGER NOT NULL,
    note TEXT,
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

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
    staff_id INTEGER NOT NULL UNIQUE,
    start_date TEXT NOT NULL,
    end_date TEXT,
    config_json TEXT NOT NULL,
    FOREIGN KEY(staff_id) REFERENCES staff(id)
  )`);

  const hasBranches = await get("SELECT COUNT(*) AS total FROM branches");
  if (hasBranches.total === 0) {
    await run("INSERT INTO branches (name) VALUES (?), (?)", ["Chi nhánh Quận 12", "Chi nhánh Tân Bình"]);
  }

  const hasStaff = await get("SELECT COUNT(*) AS total FROM staff");
  if (hasStaff.total === 0) {
    await run(
      `INSERT INTO staff (name, type, branch_id, base_salary, status, start_date, account_number, hold_remaining)
       VALUES
       ('Nguyễn Văn An', 'main', 1, 5000000, 'active', '2024-01-01', '001100001', 2000000),
       ('Trần Thị Bình', 'main', 1, 5500000, 'active', '2024-02-01', '001100002', 1500000),
       ('Lê Hoàng Cường', 'assistant', 1, 4000000, 'active', '2024-03-01', '001100003', 1000000),
       ('Phạm Thị Dung', 'assistant', 2, 4200000, 'active', '2024-01-15', '001100004', 1200000),
       ('Hoàng Văn Em', 'main', 2, 5000000, 'active', '2024-04-01', '001100005', 1800000)`
    );
  }

  const hasKpi = await get("SELECT COUNT(*) AS total FROM kpi_config");
  if (hasKpi.total === 0) {
    await run("INSERT INTO kpi_config (id, config_json) VALUES (1, ?)", [JSON.stringify(defaultKpiConfig)]);
  }
}

module.exports = { initDb };

async function runAndGetCols() {
  const rowCols = await get("SELECT group_concat(name, ',') AS cols FROM pragma_table_info('staff')");
  return (rowCols?.cols || "").split(",").filter(Boolean);
}
