// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const authRoutes      = require("./routes/auth");
const bookingRoutes   = require("./routes/bookings");
const serviceRoutes   = require("./routes/services");
const galleryRoutes   = require("./routes/gallery");
const reviewRoutes    = require("./routes/reviews");
const analyticsRoutes = require("./routes/analytics");
const contactRoutes   = require("./routes/contact");
const hoursRoutes     = require("./routes/hours");
const { sendReminders } = require("./services/smsService");

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/bookings",  bookingRoutes);
app.use("/api/services",  serviceRoutes);
app.use("/api/gallery",   galleryRoutes);
app.use("/api/reviews",   reviewRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/contact",   contactRoutes);
app.use("/api/hours",     hoursRoutes);

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://choiceesalon.vercel.app",
  ],
}));

// ── Health check ────────────────────────────────────────
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// ── SMS Reminder Cron ────────────────────────────────────
// Runs every day at 8:00 AM — sends reminders for tomorrow's bookings
cron.schedule("0 8 * * *", async () => {
  console.log("⏰ Running daily SMS reminder job...");
  await sendReminders();
});

// ── Global error handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
}); 

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Salon API running on port ${PORT}`));
