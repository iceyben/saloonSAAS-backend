// src/routes/analytics.js
const router = require("express").Router();
const prisma = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

// GET /api/analytics/overview  — dashboard summary
router.get("/overview", requireAuth, async (req, res) => {
  const now       = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total counts
  const [totalBookings, pendingBookings, todayBookings] = await Promise.all([
    prisma.booking.count({ where: { status: "APPROVED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "APPROVED", appointmentDate: { gte: todayStart, lte: todayEnd } } }),
  ]);

  // Revenue (PAID bookings only)
  const revenueQuery = async (gte) => {
    const result = await prisma.booking.findMany({
      where: { paymentStatus: "PAID", appointmentDate: { gte } },
      include: { service: true },
    });
    return result.reduce((sum, b) => sum + b.service.price, 0);
  };

  const [dailyRevenue, weeklyRevenue, monthlyRevenue] = await Promise.all([
    revenueQuery(todayStart),
    revenueQuery(weekStart),
    revenueQuery(monthStart),
  ]);

  // Most popular services (last 30 days)
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30);
  const popularServices = await prisma.booking.groupBy({
    by: ["serviceId"],
    where: { status: "APPROVED", appointmentDate: { gte: thirtyDaysAgo } },
    _count: { serviceId: true },
    orderBy: { _count: { serviceId: "desc" } },
    take: 5,
  });

  const serviceIds = popularServices.map((s) => s.serviceId);
  const services   = await prisma.service.findMany({ where: { id: { in: serviceIds } } });

  const popular = popularServices.map((s) => ({
    ...services.find((sv) => sv.id === s.serviceId),
    bookingCount: s._count.serviceId,
  }));

  // Peak hours (approved bookings, grouped by hour)
  const allBookings = await prisma.booking.findMany({
    where: { status: "APPROVED", appointmentDate: { gte: thirtyDaysAgo } },
    select: { appointmentDate: true },
  });

  const hourCounts = Array(24).fill(0);
  allBookings.forEach((b) => {
    const hour = new Date(b.appointmentDate).getHours();
    hourCounts[hour]++;
  });

  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({
    totalBookings,
    pendingBookings,
    todayBookings,
    revenue: { daily: dailyRevenue, weekly: weeklyRevenue, monthly: monthlyRevenue },
    popularServices: popular,
    peakHours,
  });
});

module.exports = router;


// ─────────────────────────────────────────────────────────────────────
