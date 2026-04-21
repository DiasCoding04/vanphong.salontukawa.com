import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthDeveloperCredit } from "../components/AuthDeveloperCredit";

export function RegisterPage() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        registrationCode: registrationCode.trim()
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Đăng ký thất bại.");
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
            <p className="auth-brand-sub">Đăng ký tài khoản quản trị</p>
          </div>
        </div>

        <div className="auth-card auth-card--wide">
          <h2 className="auth-heading">Tạo tài khoản</h2>
          <p className="auth-lead muted">Dùng Gmail hợp lệ để nhận mã khi quên mật khẩu.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form-grid">
              <label className="field">
                <span>Tên đăng nhập</span>
                <input
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="chữ thường, số, . _ -"
                  required
                  minLength={3}
                />
              </label>
              <label className="field">
                <span>Gmail</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@gmail.com"
                  required
                />
              </label>
            </div>
            <div className="auth-form-grid">
              <label className="field">
                <span>Mật khẩu</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 8 ký tự"
                  required
                  minLength={8}
                />
              </label>
              <label className="field">
                <span>Xác nhận mật khẩu</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  minLength={8}
                />
              </label>
            </div>
            <label className="field">
              <span>Mã xác thực đăng ký</span>
              <input
                value={registrationCode}
                onChange={(e) => setRegistrationCode(e.target.value)}
                placeholder="Mã được cấp cho văn phòng"
                required
                autoComplete="off"
              />
            </label>
            {error ? <p className="error-text auth-error">{error}</p> : null}
            <button type="submit" className="primary auth-submit" disabled={submitting}>
              {submitting ? "Đang tạo tài khoản…" : "Đăng ký"}
            </button>
          </form>

          <div className="auth-footer-links auth-footer-links--center">
            <span>Đã có tài khoản?</span>
            <Link to="/login">Đăng nhập</Link>
          </div>
        </div>

        <AuthDeveloperCredit />
      </div>
    </div>
  );
}
