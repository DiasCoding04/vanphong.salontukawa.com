import { vietnamCalendarDateString } from "./vietnamTime";

export function fmtMoney(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value || 0)}đ`;
}

/** Đơn vị nghìn đồng (bỏ 3 chữ số cuối của đồng — trunc, không làm tròn). Chỉ hiển thị. */
export function fmtMoneyThousands(value) {
  const k = Math.trunc((Number(value) || 0) / 1000);
  return new Intl.NumberFormat("vi-VN").format(k);
}

export function currentMonth() {
  return vietnamCalendarDateString().slice(0, 7);
}

/** Format ngày hiển thị dạng dd/mm/yy */
export function formatViDateShort(isoDateStr) {
  if (!isoDateStr) return "-";
  // Nếu là dạng DD/MM/YYYY
  const slashMatch = isoDateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[1]}/${slashMatch[2]}/${slashMatch[3].slice(-2)}`;
  
  // Nếu là dạng YYYY-MM-DD
  const isoMatch = isoDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1].slice(-2)}`;
  
  return isoDateStr;
}

/** % check-in = check-in / số khách đã làm (làm tròn). Không có khách → "—". */
export function formatCheckinRatePct(totalClients, checkins) {
  const tc = Number(totalClients) || 0;
  const ch = Number(checkins) || 0;
  if (tc <= 0) return "—";
  return `${Math.round((ch / tc) * 100)}%`;
}
