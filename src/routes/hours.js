// src/routes/hours.js
const router = require("express").Router();
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

// GET /api/hours  — public (used by booking form)
router.get("/", async (req, res) => {
  const hours = await prisma.businessHours.findMany({ orderBy: { dayOfWeek: "asc" } });
  res.json(hours);
});

// PATCH /api/hours/:id  — admin updates a day
router.patch("/:id", requireAuth, async (req, res) => {
  const { openTime, closeTime, isClosed } = req.body;
  const hours = await prisma.businessHours.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(openTime  !== undefined && { openTime }),
      ...(closeTime !== undefined && { closeTime }),
      ...(isClosed  !== undefined && { isClosed }),
    },
  });
  res.json(hours);
});

// ── Blocked slots ──────────────────────────────────────────

// GET /api/hours/blocked  — admin
router.get("/blocked", requireAuth, async (req, res) => {
  const slots = await prisma.blockedSlot.findMany({ orderBy: { startTime: "asc" } });
  res.json(slots);
});

// POST /api/hours/blocked  — admin adds a blocked slot
router.post("/blocked", requireAuth, async (req, res) => {
  const { startTime, endTime, reason } = req.body;
  if (!startTime || !endTime) return res.status(400).json({ error: "startTime and endTime required" });

  const slot = await prisma.blockedSlot.create({
    data: { startTime: new Date(startTime), endTime: new Date(endTime), reason },
  });
  res.status(201).json(slot);
});

// DELETE /api/hours/blocked/:id  — admin removes a blocked slot
router.delete("/blocked/:id", requireAuth, async (req, res) => {
  await prisma.blockedSlot.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: "Blocked slot removed" });
});

module.exports = router;
