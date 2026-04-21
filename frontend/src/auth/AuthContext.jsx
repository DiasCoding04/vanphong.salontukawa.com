import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getAuthToken, setAuthToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        if (!token) {
          setUser(null);
          return;
        }
        const data = await api.authMe();
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) {
          setAuthToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUnauth = () => {
      setUser(null);
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:unauthorized", onUnauth);
    return () => window.removeEventListener("auth:unauthorized", onUnauth);
  }, [navigate]);

  const login = useCallback(async (username, password) => {
    const data = await api.authLogin({ username, password });
    setAuthToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload) => {
    const data = await api.authRegister(payload);
    setAuthToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
