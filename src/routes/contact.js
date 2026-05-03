// src/routes/contact.js
const router = require("express").Router();
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

// POST /api/contact  — public
router.post("/", async (req, res) => {
  const { name, phone, email, message } = req.body;
  if (!name || !message) return res.status(400).json({ error: "Name and message required" });

  const msg = await prisma.contactMessage.create({ data: { name, phone, email, message } });
  res.status(201).json({ message: "Message received! We'll get back to you soon.", id: msg.id });
});

// GET /api/contact  — admin
router.get("/", requireAuth, async (req, res) => {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  res.json(messages);
});

// PATCH /api/contact/:id/read  — admin marks as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  await prisma.contactMessage.update({ where: { id: parseInt(req.params.id) }, data: { isRead: true } });
  res.json({ message: "Marked as read" });
});

module.exports = router;


// ─────────────────────────────────────────────────────────────────────
// src/routes/hours.js
// ─────────────────────────────────────────────────────────────────────
