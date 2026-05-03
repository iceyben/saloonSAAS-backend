// src/routes/auth.js
const router  = require("express").Router();
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const prisma  = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: admin.id, email: admin.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
});

// GET /api/auth/me  — verify token & return admin info
router.get("/me", requireAuth, async (req, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.admin.id },
    select: { id: true, email: true, name: true },
  });
  res.json(admin);
});

// PATCH /api/auth/password  — change password
router.patch("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
  const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!valid) return res.status(400).json({ error: "Current password is incorrect" });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.admin.update({ where: { id: req.admin.id }, data: { passwordHash } });
  res.json({ message: "Password updated successfully" });
});

module.exports = router;
