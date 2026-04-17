import { vietnamCalendarDateString } from "./vietnamTime";

export function fmtMoney(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value || 0)}đ`;
}

export function currentMonth() {
  return vietnamCalendarDateString().slice(0, 7);
}
