import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [smtpHint, setSmtpHint] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const res = await api.authForgotPassword({ email: email.trim() });
      setSmtpHint(res.hint || "");
      setMessage(res.message || "Đã gửi mã (nếu email tồn tại).");
      setStep(2);
    } catch (err) {
      setError(err.message || "Không gửi được mã.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirm) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSubmitting(true);
    try {
      await api.authResetPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword
      });
      setMessage("Đặt lại mật khẩu thành công. Chuyển tới đăng nhập…");
      setTimeout(() => navigate("/login", { replace: true }), 900);
    } catch (err) {
      setError(err.message || "Không đặt lại được mật khẩu.");
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
            <p className="auth-brand-sub">Khôi phục mật khẩu</p>
          </div>
        </div>

        <div className="auth-card auth-card--wide">
          {step === 1 ? (
            <>
              <h2 className="auth-heading">Quên mật khẩu</h2>
              <p className="auth-lead muted">
                Nhập Gmail đã đăng ký. Hệ thống gửi mã 6 số (hiệu lực 15 phút).
              </p>
              <form className="auth-form" onSubmit={handleSendCode}>
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
                {error ? <p className="error-text auth-error">{error}</p> : null}
                <button type="submit" className="primary auth-submit" disabled={submitting}>
                  {submitting ? "Đang gửi…" : "Gửi mã qua Gmail"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="auth-heading">Đặt lại mật khẩu</h2>
              <p className="auth-lead muted">Nhập mã từ email và mật khẩu mới cho {email}</p>
              {smtpHint ? <p className="auth-inline-hint muted">{smtpHint}</p> : null}
              <form className="auth-form" onSubmit={handleReset}>
                <label className="field">
                  <span>Mã 6 số</span>
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    required
                  />
                </label>
                <div className="auth-form-grid">
                  <label className="field">
                    <span>Mật khẩu mới</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </label>
                  <label className="field">
                    <span>Xác nhận</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                    />
                  </label>
                </div>
                {error ? <p className="error-text auth-error">{error}</p> : null}
                {message ? <p className="auth-success">{message}</p> : null}
                <div className="auth-row-btns">
                  <button type="button" className="secondary" onClick={() => setStep(1)}>
                    Quay lại
                  </button>
                  <button type="submit" className="primary auth-submit auth-submit--inline" disabled={submitting}>
                    {submitting ? "Đang lưu…" : "Đặt lại mật khẩu"}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="auth-footer-links auth-footer-links--center">
            <Link to="/login">Về đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
