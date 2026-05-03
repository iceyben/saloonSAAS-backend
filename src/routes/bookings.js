// src/routes/bookings.js
const router = require("express").Router();
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { uploadPayment } = require("../lib/cloudinary");
const { sendConfirmation, sendCancellation } = require("../services/smsService");

// ── Helpers ──────────────────────────────────────────────────────────────

// Generate 30-min time slots between open & close, filtering out booked/blocked slots
async function getAvailableSlots(dateStr, serviceId) {
  const date     = new Date(dateStr);
  const dayOfWeek = date.getDay();

  const hours = await prisma.businessHours.findFirst({ where: { dayOfWeek } });
  if (!hours || hours.isClosed) return [];

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return [];

  // Build all possible slots for the day
  const [openH, openM]   = hours.openTime.split(":").map(Number);
  const [closeH, closeM] = hours.closeTime.split(":").map(Number);

  const dayStart = new Date(date); dayStart.setHours(openH, openM, 0, 0);
  const dayEnd   = new Date(date); dayEnd.setHours(closeH, closeM, 0, 0);

  const slots = [];
  const cursor = new Date(dayStart);
  while (cursor < dayEnd) {
    slots.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 30);
  }

  // Fetch existing approved bookings for the day
  const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay   = new Date(date); endOfDay.setHours(23, 59, 59, 999);

  const existingBookings = await prisma.booking.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      appointmentDate: { gte: startOfDay, lte: endOfDay },
    },
    include: { service: true },
  });

  const blockedSlots = await prisma.blockedSlot.findMany({
    where: { startTime: { gte: startOfDay }, endTime: { lte: endOfDay } },
  });

  // Filter out slots that overlap with existing bookings or blocked slots
  const available = slots.filter((slot) => {
    const slotEnd = new Date(slot.getTime() + service.duration * 60000);

    const bookedConflict = existingBookings.some((b) => {
      const bEnd = new Date(b.appointmentDate.getTime() + b.durationMinutes * 60000);
      return slot < bEnd && slotEnd > b.appointmentDate;
    });

    const blockedConflict = blockedSlots.some((bl) => {
      return slot < bl.endTime && slotEnd > bl.startTime;
    });

    // Don't show past slots
    const isPast = slot < new Date();

    return !bookedConflict && !blockedConflict && !isPast;
  });

  return available.map((s) => s.toISOString());
}

// ── Public routes ─────────────────────────────────────────────────────────

// GET /api/bookings/slots?date=2025-05-10&serviceId=2
router.get("/slots", async (req, res) => {
  const { date, serviceId } = req.query;
  if (!date || !serviceId)
    return res.status(400).json({ error: "date and serviceId required" });

  const slots = await getAvailableSlots(date, parseInt(serviceId));
  res.json({ slots });
});

// POST /api/bookings  — customer creates a booking
// Accepts multipart/form-data so payment screenshot can be attached
router.post("/", uploadPayment.single("paymentScreenshot"), async (req, res) => {
  const {
    customerName, customerPhone, customerEmail,
    serviceId, appointmentDate, notes, paymentMethod,
  } = req.body;

  // Basic validation
  if (!customerName || !customerPhone || !serviceId || !appointmentDate || !paymentMethod)
    return res.status(400).json({ error: "Missing required fields" });

  const service = await prisma.service.findUnique({ where: { id: parseInt(serviceId) } });
  if (!service) return res.status(404).json({ error: "Service not found" });

  // MoMo payment requires a screenshot
  if (paymentMethod === "MOMO" && !req.file)
    return res.status(400).json({ error: "Payment screenshot required for MoMo payments" });

  // Double-check the slot is still available
  const dateObj       = new Date(appointmentDate);
  const startOfDay    = new Date(dateObj); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay      = new Date(dateObj); endOfDay.setHours(23, 59, 59, 999);
  const serviceEnd    = new Date(dateObj.getTime() + service.duration * 60000);

  const conflict = await prisma.booking.findFirst({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      appointmentDate: { gte: startOfDay, lte: endOfDay },
    },
    include: { service: true },
  });

  if (conflict) {
    const conflictEnd = new Date(conflict.appointmentDate.getTime() + conflict.durationMinutes * 60000);
    if (dateObj < conflictEnd && serviceEnd > conflict.appointmentDate)
      return res.status(409).json({ error: "This slot is no longer available. Please choose another time." });
  }

  const booking = await prisma.booking.create({
    data: {
      customerName,
      customerPhone,
      customerEmail:     customerEmail || null,
      serviceId:         parseInt(serviceId),
      appointmentDate:   new Date(appointmentDate),
      durationMinutes:   service.duration,
      notes:             notes || null,
      paymentMethod,
      paymentScreenshot: req.file?.path || null,
      status:            "PENDING",
    },
    include: { service: true },
  });

  res.status(201).json({ message: "Booking received! Awaiting confirmation.", booking });
});

// ── Admin-only routes ─────────────────────────────────────────────────────

// GET /api/bookings  — all bookings (with filters)
router.get("/", requireAuth, async (req, res) => {
  const { status, date } = req.query;
  const where = {};

  if (status) where.status = status;
  if (date) {
    const d = new Date(date);
    where.appointmentDate = {
      gte: new Date(d.setHours(0, 0, 0, 0)),
      lte: new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: { service: true },
    orderBy: { appointmentDate: "asc" },
  });
  res.json(bookings);
});

// GET /api/bookings/:id
router.get("/:id", requireAuth, async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { service: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});

// PATCH /api/bookings/:id/approve
router.patch("/:id/approve", requireAuth, async (req, res) => {
  const booking = await prisma.booking.update({
    where: { id: parseInt(req.params.id) },
    data:  { status: "APPROVED" },
    include: { service: true },
  });

  await sendConfirmation(booking);
  res.json({ message: "Booking approved. SMS sent to customer.", booking });
});

// PATCH /api/bookings/:id/cancel
router.patch("/:id/cancel", requireAuth, async (req, res) => {
  const { reason } = req.body;
  const booking = await prisma.booking.update({
    where: { id: parseInt(req.params.id) },
    data:  { status: "CANCELLED" },
    include: { service: true },
  });

  await sendCancellation(booking, reason);
  res.json({ message: "Booking cancelled. SMS sent to customer.", booking });
});

// PATCH /api/bookings/:id/reschedule
router.patch("/:id/reschedule", requireAuth, async (req, res) => {
  const { newDate } = req.body;
  if (!newDate) return res.status(400).json({ error: "newDate required" });

  const booking = await prisma.booking.update({
    where: { id: parseInt(req.params.id) },
    data:  { appointmentDate: new Date(newDate), status: "APPROVED", reminderSent: false },
    include: { service: true },
  });

  await sendConfirmation(booking);
  res.json({ message: "Booking rescheduled. SMS sent to customer.", booking });
});

// DELETE /api/bookings/:id  — hard delete (admin only)
router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.booking.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: "Booking deleted" });
});

module.exports = router;
