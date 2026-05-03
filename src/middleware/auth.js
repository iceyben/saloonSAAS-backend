// src/middleware/auth.js
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — no token provided" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized — invalid or expired token" });
  }
}

module.exports = { requireAuth };
