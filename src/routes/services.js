// src/routes/services.js
const router = require("express").Router();
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

// GET /api/services  — public
router.get("/", async (req, res) => {
  const { category } = req.query;
  const services = await prisma.service.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: { category: "asc" },
  });
  res.json(services);
});

// GET /api/services/:id  — public
router.get("/:id", async (req, res) => {
  const service = await prisma.service.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!service) return res.status(404).json({ error: "Not found" });
  res.json(service);
});

// POST /api/services  — admin
router.post("/", requireAuth, async (req, res) => {
  const { name, description, price, duration, category } = req.body;
  if (!name || !price || !duration || !category)
    return res.status(400).json({ error: "name, price, duration, category required" });
  const service = await prisma.service.create({ data: { name, description, price: parseFloat(price), duration: parseInt(duration), category } });
  res.status(201).json(service);
});

// PATCH /api/services/:id  — admin
router.patch("/:id", requireAuth, async (req, res) => {
  const { name, description, price, duration, category, isActive } = req.body;
  const service = await prisma.service.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price       !== undefined && { price: parseFloat(price) }),
      ...(duration    !== undefined && { duration: parseInt(duration) }),
      ...(category    !== undefined && { category }),
      ...(isActive    !== undefined && { isActive }),
    },
  });
  res.json(service);
});

// DELETE /api/services/:id  — admin (soft delete)
router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.service.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
  res.json({ message: "Service deactivated" });
});

module.exports = router;
