// Mock equipment for testing long lists. Run: npx tsx prisma/seed-mock-equipment.ts
// Upserts by code, so re-running is safe.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const items = [
  { code: "NB-003", name: "Notebook Lenovo ThinkPad E14", category: "Notebook", quantity: 3, description: "Core i5 Gen 13, RAM 16GB, SSD 512GB" },
  { code: "NB-004", name: "Notebook HP ProBook 450 G10", category: "Notebook", quantity: 2, description: "Core i7, RAM 16GB, จอ 15.6 นิ้ว" },
  { code: "NB-005", name: "MacBook Pro 14 M3", category: "Notebook", quantity: 1, description: "สำหรับงานกราฟิกและตัดต่อวิดีโอ" },
  { code: "PJ-002", name: "Projector BenQ MW560", category: "Projector", quantity: 2, description: "WXGA 4000 lumens พร้อมสาย HDMI" },
  { code: "PJ-003", name: "Projector Epson EB-FH52", category: "Projector", quantity: 1, description: "Full HD รองรับ Wi-Fi" },
  { code: "CM-002", name: "Camera Canon EOS M50 Mark II", category: "Camera", quantity: 1, description: "พร้อมเลนส์ 15-45mm และแบตสำรอง" },
  { code: "CM-003", name: "Webcam Logitech Brio 4K", category: "Camera", quantity: 4, description: "สำหรับประชุมออนไลน์" },
  { code: "MN-002", name: "Monitor Dell P2422H 24 inch", category: "Monitor", quantity: 6, description: "IPS Full HD ปรับความสูงได้" },
  { code: "MN-003", name: "Monitor Samsung 27 inch 4K", category: "Monitor", quantity: 2, description: "UHD พร้อมสาย DisplayPort" },
  { code: "TB-002", name: "Samsung Galaxy Tab S9", category: "Tablet", quantity: 2, description: "พร้อม S Pen และเคส" },
];

async function main() {
  const categories = await prisma.category.findMany();
  const categoryId = new Map(categories.map((c) => [c.name, c.id]));

  for (const { category, ...item } of items) {
    const id = categoryId.get(category);
    if (!id) throw new Error(`Category not found: ${category}`);
    await prisma.equipment.upsert({
      where: { code: item.code },
      update: {},
      create: { ...item, categoryId: id, status: "ACTIVE" },
    });
    console.log(`✓ ${item.code} ${item.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
