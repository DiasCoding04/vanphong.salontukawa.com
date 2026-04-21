import { useEffect } from "react";

/** Áp dụng theme đã lưu trước khi vào App (trang đăng nhập / đăng ký). */
export function ThemeBootstrap() {
  useEffect(() => {
    const t = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  return null;
}
