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
