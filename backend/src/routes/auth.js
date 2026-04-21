const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { run, get } = require("../config/db");
const { requireAuth, getJwtSecret } = require("../middleware/auth");
const { sendPasswordResetEmail } = require("../services/mailService");

const router = express.Router();

const REGISTRATION_CODE = "vanphongmoibiet";
const SALT_ROUNDS = 10;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const RESET_CODE_MIN = 100000;
const RESET_CODE_MAX = 999999;
const RESET_TTL_MS = 15 * 60 * 1000;

function normalizeUsername(u) {
  return String(u || "").trim().toLowerCase();
}

function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES }
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const { username: rawUser, password, email: rawEmail, registrationCode } = req.body || {};
    const username = normalizeUsername(rawUser);
    const email = normalizeEmail(rawEmail);
    if (!username || username.length < 3) {
      return res.status(400).json({ message: "Tên đăng nhập cần ít nhất 3 ký tự." });
    }
    if (!/^[a-z0-9._-]+$/.test(username)) {
      return res.status(400).json({ message: "Tên đăng nhập chỉ gồm chữ thường, số, . _ -" });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: "Mật khẩu cần ít nhất 8 ký tự." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email không hợp lệ." });
    }
    if (String(registrationCode || "").trim() !== REGISTRATION_CODE) {
      return res.status(400).json({ message: "Mã xác thực đăng ký không đúng." });
    }

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const result = await run(
      "INSERT INTO admin_users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, passwordHash]
    );
    const row = await get("SELECT id, username, email, created_at FROM admin_users WHERE id = ?", [result.id]);
    const token = signToken(row);
    res.status(201).json({
      token,
      user: { id: row.id, username: row.username, email: row.email }
    });
  } catch (error) {
    if (error && error.code === "SQLITE_CONSTRAINT") {
      return res.status(400).json({ message: "Tên đăng nhập hoặc email đã được sử dụng." });
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { username: rawUser, password } = req.body || {};
    const username = normalizeUsername(rawUser);
    if (!username || !password) {
      return res.status(400).json({ message: "Nhập tên đăng nhập và mật khẩu." });
    }
    const row = await get("SELECT * FROM admin_users WHERE username = ?", [username]);
    if (!row) {
      return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu." });
    }
    const ok = await bcrypt.compare(String(password), row.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu." });
    }
    const token = signToken({
      id: row.id,
      username: row.username,
      email: row.email
    });
    res.json({
      token,
      user: { id: row.id, username: row.username, email: row.email }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const row = await get("SELECT id, username, email, created_at FROM admin_users WHERE id = ?", [req.user.id]);
    if (!row) return res.status(401).json({ message: "Tài khoản không tồn tại." });
    res.json({ user: { id: row.id, username: row.username, email: row.email } });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email không hợp lệ." });
    }
    const user = await get("SELECT id FROM admin_users WHERE email = ?", [email]);
    if (!user) {
      return res.json({
        ok: true,
        message: "Nếu email đã đăng ký, bạn sẽ nhận được mã đặt lại mật khẩu."
      });
    }

    const code = String(crypto.randomInt(RESET_CODE_MIN, RESET_CODE_MAX + 1));
    const codeHash = await bcrypt.hash(code, SALT_ROUNDS);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS).toISOString();

    await run("DELETE FROM password_reset_codes WHERE email = ?", [email]);
    await run(
      "INSERT INTO password_reset_codes (email, code_hash, expires_at) VALUES (?, ?, ?)",
      [email, codeHash, expiresAt]
    );

    const mailResult = await sendPasswordResetEmail(email, code);
    const extra =
      mailResult.sent === false
        ? { hint: "SMTP chưa cấu hình: xem mã trên console máy chủ (log)." }
        : {};

    res.json({
      ok: true,
      message: "Nếu email đã đăng ký, bạn sẽ nhận được mã đặt lại mật khẩu.",
      ...extra
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    const newPassword = req.body?.newPassword;
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Email không hợp lệ." });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Mã gồm 6 chữ số." });
    }
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ message: "Mật khẩu mới cần ít nhất 8 ký tự." });
    }

    const row = await get(
      "SELECT * FROM password_reset_codes WHERE email = ? ORDER BY id DESC LIMIT 1",
      [email]
    );
    if (!row) {
      return res.status(400).json({ message: "Mã không hợp lệ hoặc đã hết hạn." });
    }
    const exp = new Date(row.expires_at).getTime();
    if (Number.isNaN(exp) || exp < Date.now()) {
      await run("DELETE FROM password_reset_codes WHERE id = ?", [row.id]);
      return res.status(400).json({ message: "Mã không hợp lệ hoặc đã hết hạn." });
    }

    const match = await bcrypt.compare(code, row.code_hash);
    if (!match) {
      return res.status(400).json({ message: "Mã xác thực không đúng." });
    }

    const user = await get("SELECT id FROM admin_users WHERE email = ?", [email]);
    if (!user) {
      await run("DELETE FROM password_reset_codes WHERE email = ?", [email]);
      return res.status(400).json({ message: "Không tìm thấy tài khoản." });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);
    await run("UPDATE admin_users SET password_hash = ? WHERE id = ?", [passwordHash, user.id]);
    await run("DELETE FROM password_reset_codes WHERE email = ?", [email]);

    res.json({ ok: true, message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
