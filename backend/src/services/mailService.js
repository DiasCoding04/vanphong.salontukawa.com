const nodemailer = require("nodemailer");

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      String(process.env.SMTP_FROM || "").trim() !== ""
  );
}

async function sendPasswordResetEmail(to, code) {
  const from = String(process.env.SMTP_FROM || "").trim();
  const subject = "Mã đặt lại mật khẩu — Tú Ka Wa Office";
  const text = `Mã xác thực đặt lại mật khẩu của bạn: ${code}\nMã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;

  if (!isSmtpConfigured()) {
    console.warn("[mail] SMTP chưa cấu hình. Mã đặt lại mật khẩu:", code, "→", to);
    return { sent: false, reason: "smtp_not_configured" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: `<p>Mã xác thực đặt lại mật khẩu của bạn:</p><p style="font-size:22px;font-weight:700;letter-spacing:0.15em;">${code}</p><p style="color:#64748b;font-size:13px;">Mã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`
  });
  return { sent: true };
}

module.exports = { sendPasswordResetEmail, isSmtpConfigured };
