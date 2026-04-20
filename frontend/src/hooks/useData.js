/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

export function useData() {
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  const reload = async (silent = false) => {
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
      setError(e.message || "Không thể tải dữ liệu từ máy chủ");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return { branches, staff, loading, error, reload, reloadVersion };
}
