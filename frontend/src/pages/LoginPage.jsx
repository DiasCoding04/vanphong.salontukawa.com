import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthDeveloperCredit } from "../components/AuthDeveloperCredit";

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-inner">
          <div className="auth-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-bg" aria-hidden />
      <div className="auth-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark">TKW</span>
          <div>
            <h1 className="auth-brand-title">Tú Ka Wa Office</h1>
            <p className="auth-brand-sub">Đăng nhập quản trị</p>
          </div>
        </div>

        <div className="auth-card">
          <h2 className="auth-heading">Chào mừng trở lại</h2>
          <p className="auth-lead muted">Nhập tài khoản để vào hệ thống KPI và lương.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Tên đăng nhập</span>
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="vd: admin"
                required
              />
            </label>
            <label className="field">
              <span>Mật khẩu</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>
            {error ? <p className="error-text auth-error">{error}</p> : null}
            <button type="submit" className="primary auth-submit" disabled={submitting}>
              {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>
          </form>

          <div className="auth-footer-links">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
            <span className="auth-dot" aria-hidden />
            <Link to="/register">Tạo tài khoản</Link>
          </div>
        </div>

        <p className="auth-legal muted">Chỉ dành cho nội bộ văn phòng Tú Ka Wa.</p>
        <AuthDeveloperCredit />
      </div>
    </div>
  );
}
