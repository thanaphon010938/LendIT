// Mock serial numbers for devices that don't have one yet. Run: npx tsx prisma/seed-mock-serials.ts
// Formats imitate each brand's real pattern. Only fills empty serials, so re-running is safe.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const DIGITS = "0123456789";
const pick = (chars: string, n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

/** Brand-like serial for an equipment model name. */
function serialFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("dell")) return pick(ALNUM, 7); // Dell service tag
  if (n.includes("hp ")) return `5CD${pick(DIGITS, 3)}${pick(ALNUM, 4)}`;
  if (n.includes("lenovo") || n.includes("thinkpad")) return `PF${pick(ALNUM, 6)}`;
  if (n.includes("macbook") || n.includes("ipad")) return pick(ALNUM, 10); // Apple randomized serial
  if (n.includes("logitech")) return `${pick(DIGITS, 4)}LZ${pick(ALNUM, 6)}`;
  if (n.includes("lg ")) return `${pick(DIGITS, 3)}NT${pick(ALNUM, 5)}`;
  if (n.includes("samsung")) return `R${pick(ALNUM, 2)}${pick(DIGITS, 4)}${pick(ALNUM, 5)}`;
  if (n.includes("epson")) return `X${pick(ALNUM, 3)}${pick(DIGITS, 6)}`;
  if (n.includes("benq")) return `PD${pick(ALNUM, 4)}${pick(DIGITS, 5)}`;
  if (n.includes("canon")) return pick(DIGITS, 12);
  return pick(ALNUM, 10);
}

async function main() {
  const units = await prisma.equipmentUnit.findMany({
    // Units created without a serial don't have the field at all in MongoDB, so match "unset" too.
    where: { OR: [{ serialNumber: { isSet: false } }, { serialNumber: null }, { serialNumber: "" }] },
    include: { equipment: { select: { name: true } } },
    orderBy: { assetTag: "asc" },
  });

  const used = new Set(
    (await prisma.equipmentUnit.findMany({ where: { serialNumber: { not: null } }, select: { serialNumber: true } })).map((u) => u.serialNumber)
  );

  for (const unit of units) {
    let serial = serialFor(unit.equipment.name);
    while (used.has(serial)) serial = serialFor(unit.equipment.name);
    used.add(serial);
    await prisma.equipmentUnit.update({ where: { id: unit.id }, data: { serialNumber: serial } });
    console.log(`${unit.assetTag.padEnd(12)} ${serial.padEnd(14)} ${unit.equipment.name}`);
  }
  console.log(`\nfilled ${units.length} serial number(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
