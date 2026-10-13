import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_DEPARTMENTS, DEPARTMENT_CODE } from "../src/lib/department";

const prisma = new PrismaClient();

async function main() {
  const departmentByCode = new Map<string, { id: string }>();
  for (const dept of DEFAULT_DEPARTMENTS) {
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: dept,
    });
    departmentByCode.set(dept.code, record);
  }

  const adminPassword = await bcrypt.hash("admin1234", 10);
  const userPassword = await bcrypt.hash("user1234", 10);

  const existingAdmin = await prisma.user.findFirst({
    where: { OR: [{ employeeId: "EMP-ADMIN" }, { email: "admin@lendit.local" }] },
  });
  const adminData: Prisma.UserUncheckedCreateInput = {
      employeeId: "EMP-ADMIN",
      name: "ผู้ดูแลระบบ",
      email: "admin@lendit.local",
      password: adminPassword,
      role: "ADMIN",
      approvalStatus: "APPROVED",
      departmentId: departmentByCode.get(DEPARTMENT_CODE.IT)!.id,
      phone: "1234",
    };
  const admin = existingAdmin
    ? await prisma.user.update({ where: { id: existingAdmin.id }, data: adminData })
    : await prisma.user.create({ data: adminData });

  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ employeeId: "EMP-0001" }, { email: "user@lendit.local" }] },
  });
  const userData: Prisma.UserUncheckedCreateInput = {
      employeeId: "EMP-0001",
      name: "สมชาย ใจดี",
      email: "user@lendit.local",
      password: userPassword,
      role: "USER",
      approvalStatus: "APPROVED",
      departmentId: departmentByCode.get(DEPARTMENT_CODE.ACCOUNTING)!.id,
      phone: "5678",
    };
  const user = existingUser
    ? await prisma.user.update({ where: { id: existingUser.id }, data: userData })
    : await prisma.user.create({ data: userData });

  const categoryNames = ["Notebook", "Projector", "Camera", "Monitor", "Tablet"];
  const categoryByName = new Map<string, { id: string }>();
  for (const name of categoryNames) {
    const record = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryByName.set(name, record);
  }

  const equipmentData = [
    {
      code: "NB-001",
      name: "Notebook Dell Latitude 5440",
      category: "Notebook",
      description: "Intel Core i5, RAM 16GB, SSD 512GB",
      imageUrl: null,
      quantity: 3,
      status: "ACTIVE" as const,
      hiddenFromUsers: false,
    },
    {
      code: "NB-002",
      name: "MacBook Air M2",
      category: "Notebook",
      description: "RAM 8GB, SSD 256GB",
      imageUrl: null,
      quantity: 2,
      status: "ACTIVE" as const,
      hiddenFromUsers: false,
    },
    {
      code: "PJ-001",
      name: "Projector Epson EB-X06",
      category: "Projector",
      description: "3600 lumens, HDMI/VGA",
      imageUrl: null,
      quantity: 4,
      status: "ACTIVE" as const,
      hiddenFromUsers: false,
    },
    {
      code: "CM-001",
      name: "Webcam Logitech C920",
      category: "Camera",
      description: "Full HD 1080p",
      imageUrl: null,
      quantity: 6,
      status: "ACTIVE" as const,
      hiddenFromUsers: false,
    },
    {
      code: "MN-001",
      name: "Monitor LG 24 inch",
      category: "Monitor",
      description: "Full HD IPS",
      imageUrl: null,
      quantity: 5,
      status: "ACTIVE" as const,
      hiddenFromUsers: false,
    },
    {
      code: "TB-001",
      name: "iPad 10th Gen",
      category: "Tablet",
      description: "64GB, Wi-Fi",
      imageUrl: null,
      quantity: 2,
      status: "ACTIVE" as const,
      hiddenFromUsers: false,
    },
  ];

  for (const eq of equipmentData) {
    const { category, ...rest } = eq;
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: {},
      create: { ...rest, categoryId: categoryByName.get(category)!.id },
    });
  }

  const notebook2 = await prisma.equipment.findUnique({ where: { code: "NB-002" } });
  const projector = await prisma.equipment.findUnique({ where: { code: "PJ-001" } });

  if (notebook2) {
    const existingLoan = await prisma.loan.findFirst({
      where: { equipmentId: notebook2.id },
    });
    if (!existingLoan) {
      await prisma.loan.create({
        data: {
          equipmentId: notebook2.id,
          equipmentIds: [notebook2.id],
          userId: user.id,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: "PENDING",
          quantity: 1,
          purpose: "ขอยืมใช้งานนำเสนอโครงการ",
        },
      });
    }
  }

  if (notebook2 && projector) {
    const existingBulkLoan = await prisma.loan.findFirst({
      where: {
        AND: [{ equipmentIds: { has: notebook2.id } }, { equipmentIds: { has: projector.id } }],
      },
    });
    if (!existingBulkLoan) {
      await prisma.loan.create({
        data: {
          equipmentId: notebook2.id,
          equipmentIds: [notebook2.id, projector.id],
          userId: admin.id,
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          status: "PENDING",
          quantity: 2,
          purpose: "ขอยืมหลายอุปกรณ์พร้อมกันสำหรับงานประชุม",
        },
      });
    }
  }

  console.log("Seed completed:", { admin: admin.email, user: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
