// One-time migration: turn count-based equipment into individually tracked devices.
//   npx tsx prisma/migrate-to-units.ts            -> show what would change (dry run)
//   npx tsx prisma/migrate-to-units.ts --apply    -> write the changes
// For each equipment without devices: creates <code>-01..NN, hands devices to loans currently out,
// parks devices for open repair items, then marks the model as trackUnits. Safe to re-run.
import { PrismaClient, type UnitStatus } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

async function main() {
  // Records created before this field existed don't have it at all; Prisma filters can't match a
  // missing required field in MongoDB, so find them with a raw `$ne: true` query.
  const raw = (await prisma.equipment.findRaw({ filter: { trackUnits: { $ne: true } } })) as unknown as { _id: { $oid: string } }[];
  const equipment = await prisma.equipment.findMany({
    where: { id: { in: raw.map((doc) => doc._id.$oid) } },
    orderBy: { code: "asc" },
  });
  console.log(`${apply ? "APPLY" : "DRY RUN"} - ${equipment.length} equipment model(s) to convert\n`);

  for (const item of equipment) {
    if ((await prisma.equipmentUnit.count({ where: { equipmentId: item.id } })) > 0) {
      console.log(`- ${item.code}: already has devices, skipped`);
      continue;
    }

    const activeLoans = await prisma.loan.findMany({
      where: { equipmentId: item.id, status: "APPROVED" },
      orderBy: { approvedAt: "asc" },
    });
    const openIssues = await prisma.equipmentIssue.findMany({ where: { equipmentId: item.id, status: "OPEN", unitId: null } });

    const needed = activeLoans.reduce((s, l) => s + l.quantity, 0) + openIssues.reduce((s, i) => s + i.quantity, 0);
    const total = Math.max(item.quantity, needed);
    if (needed > item.quantity) {
      console.log(`  ! ${item.code}: quantity ${item.quantity} is less than units in use (${needed}); creating ${total}`);
    }

    const tags = Array.from({ length: total }, (_, i) => `${item.code}-${String(i + 1).padStart(2, "0")}`);
    const plan: { tag: string; status: UnitStatus; loanId?: string; issueId?: string }[] = tags.map((tag) => ({ tag, status: "AVAILABLE" }));
    let cursor = 0;
    for (const loan of activeLoans) {
      for (let i = 0; i < loan.quantity; i++) Object.assign(plan[cursor++], { status: "ON_LOAN", loanId: loan.id });
    }
    for (const issue of openIssues) {
      for (let i = 0; i < issue.quantity; i++) {
        Object.assign(plan[cursor++], { status: issue.condition === "LOST" ? "LOST" : "IN_REPAIR", issueId: issue.id });
      }
    }

    const summary = plan.map((p) => `${p.tag}${p.status === "AVAILABLE" ? "" : ` (${p.status})`}`).join(", ");
    console.log(`- ${item.code} ${item.name}: ${summary}`);
    if (!apply) continue;

    const created = new Map<string, string>();
    for (const p of plan) {
      const unit = await prisma.equipmentUnit.create({ data: { equipmentId: item.id, assetTag: p.tag, status: p.status } });
      created.set(p.tag, unit.id);
    }
    for (const loan of activeLoans) {
      const unitIds = plan.filter((p) => p.loanId === loan.id).map((p) => created.get(p.tag)!);
      await prisma.loan.update({ where: { id: loan.id }, data: { unitIds } });
    }
    for (const issue of openIssues) {
      // One issue per device: the first device takes the existing record, the rest get copies.
      const unitIds = plan.filter((p) => p.issueId === issue.id).map((p) => created.get(p.tag)!);
      await prisma.equipmentIssue.update({ where: { id: issue.id }, data: { unitId: unitIds[0], quantity: 1 } });
      for (const unitId of unitIds.slice(1)) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = issue;
        await prisma.equipmentIssue.create({ data: { ...rest, unitId, quantity: 1 } });
      }
    }
    await prisma.equipment.update({ where: { id: item.id }, data: { trackUnits: true, quantity: total } });
  }

  if (!apply) console.log("\nNothing was written. Re-run with --apply to convert.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
