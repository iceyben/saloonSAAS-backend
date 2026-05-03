// src/services/smsService.js
const AfricasTalking = require("africastalking");
const prisma = require("../lib/prisma");

const at = AfricasTalking({
  username: process.env.AT_USERNAME, // "sandbox" for testing
  apiKey:   process.env.AT_API_KEY,
});
const sms = at.SMS;

const SALON = process.env.SALON_NAME  || "Glam Studio";
const PHONE = process.env.SALON_PHONE || "";

// Format: "Monday, 12 May 2025 at 10:00 AM"
function formatDate(date) {
  return new Date(date).toLocaleString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

async function sendSMS(to, message) {
  try {
    // Africa's Talking expects numbers in international format: +250700000000
    const result = await sms.send({
      to:      [to],
      message,
      from:    process.env.AT_SENDER_ID || undefined,
    });
    console.log("📱 SMS sent:", result);
    return result;
  } catch (err) {
    console.error("❌ SMS failed:", err.message);
  }
}

// Called when owner approves a booking
async function sendConfirmation(booking) {
  const msg =
    `Hi ${booking.customerName}! Your appointment at ${SALON} is CONFIRMED.\n` +
    `📅 ${formatDate(booking.appointmentDate)}\n` +
    `💇 ${booking.service.name}\n` +
    `Payment: ${booking.paymentMethod === "MOMO" ? "MoMo (screenshot received)" : "Cash on arrival"}\n` +
    `Questions? Call/WhatsApp: ${PHONE}`;

  await sendSMS(booking.customerPhone, msg);

  await prisma.booking.update({
    where: { id: booking.id },
    data: { confirmationSent: true },
  });
}

// Called when owner cancels a booking
async function sendCancellation(booking, reason) {
  const msg =
    `Hi ${booking.customerName}, unfortunately your appointment at ${SALON} on ` +
    `${formatDate(booking.appointmentDate)} has been CANCELLED.\n` +
    (reason ? `Reason: ${reason}\n` : "") +
    `Please call/WhatsApp ${PHONE} to rebook.`;

  await sendSMS(booking.customerPhone, msg);
}

// Cron job: runs every morning, sends reminders for tomorrow's bookings
async function sendReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const start = new Date(tomorrow.setHours(0, 0, 0, 0));
  const end   = new Date(tomorrow.setHours(23, 59, 59, 999));

  const bookings = await prisma.booking.findMany({
    where: {
      status:       "APPROVED",
      reminderSent: false,
      appointmentDate: { gte: start, lte: end },
    },
    include: { service: true },
  });

  for (const b of bookings) {
    const msg =
      `Hi ${b.customerName}! Reminder: you have an appointment at ${SALON} TOMORROW.\n` +
      `📅 ${formatDate(b.appointmentDate)}\n` +
      `💇 ${b.service.name}\n` +
      `See you soon! Questions? ${PHONE}`;

    await sendSMS(b.customerPhone, msg);
    await prisma.booking.update({ where: { id: b.id }, data: { reminderSent: true } });
  }

  console.log(`📱 Sent ${bookings.length} reminder(s)`);
}

module.exports = { sendConfirmation, sendCancellation, sendReminders };
