// src/routes/gallery.js
const router = require("express").Router();
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");
const { cloudinary, uploadGallery } = require("../lib/cloudinary");

// GET /api/gallery  — public (filter by ?category=Hair)
router.get("/", async (req, res) => {
  const { category } = req.query;
  const photos = await prisma.galleryPhoto.findMany({
    where: { isVisible: true, ...(category ? { category } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  res.json(photos);
});

// POST /api/gallery  — admin, upload photo
router.post("/", requireAuth, uploadGallery.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Photo file required" });
  const { caption, category } = req.body;
  if (!category) return res.status(400).json({ error: "Category required" });

  const photo = await prisma.galleryPhoto.create({
    data: {
      imageUrl: req.file.path,
      publicId: req.file.filename,
      caption:  caption || null,
      category,
    },
  });
  res.status(201).json(photo);
});

// DELETE /api/gallery/:id  — admin, also removes from Cloudinary
router.delete("/:id", requireAuth, async (req, res) => {
  const photo = await prisma.galleryPhoto.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!photo) return res.status(404).json({ error: "Photo not found" });

  await cloudinary.uploader.destroy(photo.publicId);
  await prisma.galleryPhoto.delete({ where: { id: photo.id } });
  res.json({ message: "Photo deleted" });
});

// PATCH /api/gallery/:id  — admin, update visibility/caption
router.patch("/:id", requireAuth, async (req, res) => {
  const { caption, isVisible, sortOrder, category } = req.body;
  const photo = await prisma.galleryPhoto.update({
    where: { id: parseInt(req.params.id) },
    data: {
      ...(caption    !== undefined && { caption }),
      ...(isVisible  !== undefined && { isVisible }),
      ...(sortOrder  !== undefined && { sortOrder: parseInt(sortOrder) }),
      ...(category   !== undefined && { category }),
    },
  });
  res.json(photo);
});

module.exports = router;
