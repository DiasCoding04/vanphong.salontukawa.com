/** Múi giờ chuẩn cho toàn bộ giao diện (Hồ Chí Minh, không DST). */
export const VIETNAM_TIMEZONE = "Asia/Ho_Chi_Minh";

/** Chuỗi lịch YYYY-MM-DD theo múi giờ Việt Nam tại thời điểm `date`. */
export function vietnamCalendarDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function vietnamCalendarParts(date = new Date()) {
  const s = vietnamCalendarDateString(date);
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
}

/** Ngày mai theo lịch Việt Nam (cùng logic cộng 24h từ trưa +07 để tránh lệch ngày). */
export function vietnamTomorrowParts(date = new Date()) {
  const { year, month, day } = vietnamCalendarParts(date);
  const pad = (n) => String(n).padStart(2, "0");
  const noon = new Date(`${year}-${pad(month)}-${pad(day)}T12:00:00+07:00`);
  return vietnamCalendarParts(new Date(noon.getTime() + 86400000));
}

/** Ngày hôm nay dạng YYYY-MM-DD (đặt mặc định form / chấm công). */
export function vietnamTodayIsoDate(date = new Date()) {
  return vietnamCalendarDateString(date);
}

/** Ngày sinh lưu dạng DD/MM/YYYY. */
export function parseDdMmYyyyBirth(birthDate) {
  if (!birthDate || typeof birthDate !== "string") return null;
  const m = birthDate.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return { day: Number(m[1]), month: Number(m[2]), year: Number(m[3]) };
}

export function isBirthdayOnVietnamCalendarDay(birthDateStr, targetMonth, targetDay) {
  const p = parseDdMmYyyyBirth(birthDateStr);
  if (!p) return false;
  return p.month === targetMonth && p.day === targetDay;
}

/** Cộng/trừ ngày trên chuỗi YYYY-MM-DD (múi +07). */
export function addIsoDays(isoDate, deltaDays) {
  const d = new Date(`${isoDate}T12:00:00+07:00`);
  d.setDate(d.getDate() + deltaDays);
  return vietnamCalendarDateString(d);
}

/** Thứ Hai → Chủ nhật chứa `isoDate` (tuần theo lịch VN). */
export function getMondaySundayIsoWeekContaining(isoDate) {
  const d = new Date(`${isoDate}T12:00:00+07:00`);
  const dow = d.getDay();
  const daysFromMonday = (dow + 6) % 7;
  const weekStart = addIsoDays(isoDate, -daysFromMonday);
  const weekEnd = addIsoDays(weekStart, 6);
  return { weekStart, weekEnd };
}

/** Ngày đầu tháng (YYYY-MM-01) từ chuỗi "YYYY-MM". */
export function firstDayOfMonthIso(monthYyyyMm) {
  const [y, m] = String(monthYyyyMm || "")
    .split("-")
    .map(Number);
  if (!y || !m) return null;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

/** Ngày cuối tháng của chuỗi "YYYY-MM". */
export function lastDayOfMonthIso(monthYyyyMm) {
  const [y, m] = monthYyyyMm.split("-").map(Number);
  const last = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

/**
 * Nhân viên có làm việc ít nhất một ngày trong tháng lịch (giao [đầu tháng, cuối tháng] với [startDate, endDate]).
 * Khớp logic backend `overlapsEmploymentClause` + KPI tháng.
 */
export function employmentOverlapsMonth(staff, monthYyyyMm) {
  const from = firstDayOfMonthIso(monthYyyyMm);
  const to = lastDayOfMonthIso(monthYyyyMm);
  if (!from || !to) return false;
  if (staff.startDate && staff.startDate > to) return false;
  if (staff.endDate && staff.endDate < from) return false;
  return true;
}

/** Giao khoảng ngày ISO [from, to] với khoảng làm việc nhân viên. */
export function employmentOverlapsIsoRange(staff, fromIso, toIso) {
  if (staff.startDate && staff.startDate > toIso) return false;
  if (staff.endDate && staff.endDate < fromIso) return false;
  return true;
}
