// src/routes/reviews.js
const router = require("express").Router();
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

// GET /api/reviews  — public (approved only)
router.get("/", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

// GET /api/reviews/all  — admin (all statuses)
router.get("/all", requireAuth, async (req, res) => {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
  res.json(reviews);
});

// POST /api/reviews  — public, customer submits
router.post("/", async (req, res) => {
  const { customerName, feedback, rating } = req.body;
  if (!customerName || !feedback || !rating)
    return res.status(400).json({ error: "customerName, feedback, and rating required" });
  if (rating < 1 || rating > 5)
    return res.status(400).json({ error: "Rating must be between 1 and 5" });

  const review = await prisma.review.create({
    data: { customerName, feedback, rating: parseInt(rating) },
  });
  res.status(201).json({ message: "Thank you for your review! It will appear after moderation.", review });
});

// PATCH /api/reviews/:id/approve  — admin
router.patch("/:id/approve", requireAuth, async (req, res) => {
  const review = await prisma.review.update({ where: { id: parseInt(req.params.id) }, data: { status: "APPROVED" } });
  res.json(review);
});

// PATCH /api/reviews/:id/reject  — admin
router.patch("/:id/reject", requireAuth, async (req, res) => {
  const review = await prisma.review.update({ where: { id: parseInt(req.params.id) }, data: { status: "REJECTED" } });
  res.json(review);
});

// DELETE /api/reviews/:id  — admin
router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.review.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: "Review deleted" });
});

module.exports = router;


// ─────────────────────────────────────────────────────────────
// src/routes/analytics.js  (inline export below)
// ─────────────────────────────────────────────────────────────
