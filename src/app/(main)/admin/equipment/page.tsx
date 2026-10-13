import { db } from "@/lib/db";
import * as equipmentService from "@/services/equipment.service";
import * as categoryService from "@/services/category.service";
import { EquipmentAdminList, type AdminUnit } from "@/components/admin/equipment-admin-list";

export default async function AdminEquipmentPage({ searchParams }: { searchParams: { category?: string } }) {
  const [equipment, categories, units, loanCounts, issueCounts] = await Promise.all([
    equipmentService.listEquipment(undefined, { includeHidden: true }),
    categoryService.listCategories(),
    // Every device, for the per-status breakdown and asset tag / serial search.
    db.equipmentUnit.findMany({
      where: { status: { not: "RETIRED" } },
      select: { equipmentId: true, assetTag: true, serialNumber: true, status: true },
      orderBy: { assetTag: "asc" },
    }),
    db.loan.groupBy({ by: ["equipmentId"], _count: { _all: true } }),
    db.equipmentIssue.groupBy({ by: ["equipmentId"], _count: { _all: true } }),
  ]);

  const unitsByEquipment = new Map<string, AdminUnit[]>();
  for (const { equipmentId, ...unit } of units) {
    unitsByEquipment.set(equipmentId, [...(unitsByEquipment.get(equipmentId) ?? []), unit]);
  }
  const withHistory = new Set([
    ...loanCounts.flatMap((g) => (g.equipmentId ? [g.equipmentId] : [])),
    ...issueCounts.map((g) => g.equipmentId),
  ]);

  const rows = equipment.map((item) => ({
    ...item,
    units: unitsByEquipment.get(item.id) ?? [],
    hasHistory: withHistory.has(item.id),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">จัดการอุปกรณ์</h1>
        <p className="mt-1 text-muted-foreground">เพิ่ม แก้ไข หรือลบอุปกรณ์และประเภทอุปกรณ์ในคลัง</p>
      </div>

      <EquipmentAdminList equipment={rows} categories={categories} initialCategoryId={searchParams.category} />
    </div>
  );
}
