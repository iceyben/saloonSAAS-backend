const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("adminPassword", 10);
  await prisma.admin.upsert({
    where: { email: "benjaminmulbah3@gmail.com" },
    update: {},
    create: { email: "benjaminmulbah3@gmail.com", passwordHash, name: "Salon Owner" },
  });
  console.log("✅ Admin created");

  const services = [
    { name: "Braids",         category: "Hair",   price: 50,  duration: 120, description: "Box braids, cornrows, and more." },
    { name: "Wig Installation",       category: "Hair",  price: 20,  duration: 60,  description: "Professional wig fitting and styling." },
    { name: "Lash Extensions",      category: "Makeup",  price: 35,  duration: 75,  description: "Full, natural-looking lash extensions." },
    { name: "Full Makeup",    category: "Makeup", price: 40,  duration: 60,  description: "Complete makeup look." },
    { name: "Bridal Makeup",  category: "Makeup", price: 80,  duration: 90,  description: "Premium bridal look." },
  ];

  for (const s of services) {
    await prisma.service.create({ data: s });
  }
  console.log(`✅ ${services.length} services created`);

  const hours = [
    { dayOfWeek: 0, openTime: "09:00", closeTime: "17:00", isClosed: true  },
    { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 2, openTime: "08:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 3, openTime: "08:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 4, openTime: "08:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 5, openTime: "08:00", closeTime: "18:00", isClosed: false },
    { dayOfWeek: 6, openTime: "09:00", closeTime: "16:00", isClosed: false },
  ];

  for (const h of hours) {
    await prisma.businessHours.create({ data: h });
  }
  console.log("✅ Business hours set");

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
