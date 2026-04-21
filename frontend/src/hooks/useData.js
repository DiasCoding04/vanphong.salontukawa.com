/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";

/** Polling nền giữ branches + staff luôn đồng bộ cho mọi trang, không cần F5. */
const GLOBAL_POLL_MS = 20_000;

export function useData() {
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [b, s] = await Promise.all([
        api.getBranches(),
        api.getStaff()
      ]);
      setBranches(b);
      setStaff(s);
      setReloadVersion(v => v + 1);
    } catch (e) {
      console.error("Lỗi khi tải dữ liệu:", e);
      if (!silent) setError(e.message || "Không thể tải dữ liệu từ máy chủ");
      /* silent poll: giữ dữ liệu cũ khi mạng chớp, tránh hiển thị lỗi vô cớ. */
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    reload();
  }, [reload]);

  /** Polling nền: đồng bộ branches + staff khi tab đang mở. */
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === "visible") reloadRef.current(true);
    };
    const id = setInterval(sync, GLOBAL_POLL_MS);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return { branches, staff, loading, error, reload, reloadVersion };
}
