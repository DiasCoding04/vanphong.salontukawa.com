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

/** % check-in = check-in / số khách đã làm (làm tròn). Không có khách → "—". */
export function formatCheckinRatePct(totalClients, checkins) {
  const tc = Number(totalClients) || 0;
  const ch = Number(checkins) || 0;
  if (tc <= 0) return "—";
  return `${Math.round((ch / tc) * 100)}%`;
}
