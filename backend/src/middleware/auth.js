const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s && String(s).trim() !== "") return String(s).trim();
  if (process.env.NODE_ENV !== "production") {
    return "vanphong-dev-jwt-secret-not-for-production";
  }
  throw new Error("JWT_SECRET is not set in environment");
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return res.status(401).json({ message: "Chưa đăng nhập hoặc phiên hết hạn." });
  }
  try {
    const payload = jwt.verify(match[1], getJwtSecret());
    req.user = { id: payload.sub, username: payload.username, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." });
  }
}

module.exports = { requireAuth, getJwtSecret };
