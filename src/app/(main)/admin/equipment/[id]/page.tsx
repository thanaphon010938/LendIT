import Link from "next/link";
import { notFound } from "next/navigation";
import * as equipmentService from "@/services/equipment.service";
import * as categoryService from "@/services/category.service";
import { EquipmentDialog } from "@/components/equipment/equipment-form";
import { UnitsManager, type ManagedUnit } from "@/components/equipment/units-manager";
import * as unitModel from "@/models/equipment-unit.model";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentAvailabilityBadge } from "@/components/shared/status-badge";
import { cn, formatDate } from "@/lib/utils";
import { getEquipmentIcon, getCategoryColor } from "@/lib/equipment-icon";
import { ArrowLeft, EyeOff, Pencil } from "lucide-react";

export default async function AdminEquipmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [equipment, categories] = await Promise.all([
    equipmentService.getEquipmentDetail(params.id, { includeHidden: true }),
    categoryService.listCategories(),
  ]);

  if (!equipment) {
    notFound();
  }

  const Icon = getEquipmentIcon(equipment.category.name);

  let units: ManagedUnit[] = [];
  if (equipment.trackUnits) {
    const rawUnits = await equipmentService.listUnits(equipment.id);
    const unitIds = rawUnits.map((u) => u.id);
    const [activeLoans, loanCounts] = await Promise.all([
      unitModel.findActiveLoansForUnits(unitIds),
      unitModel.countLoansPerUnit(unitIds),
    ]);
    units = rawUnits.map((unit) => {
      const loan = activeLoans.find((l) => l.unitIds.includes(unit.id));
      return {
        id: unit.id,
        assetTag: unit.assetTag,
        serialNumber: unit.serialNumber,
        status: unit.status,
        note: unit.note,
        holder: loan ? { name: loan.user?.name ?? "ไม่ทราบชื่อ", dueDate: loan.dueDate } : null,
        loanCount: loanCounts.get(unit.id) ?? 0,
      };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/equipment" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          กลับไปจัดการอุปกรณ์
        </Link>

        <EquipmentDialog
          equipment={equipment}
          categories={categories}
          trigger={
            <Button type="button">
              <Pencil className="h-4 w-4" />
              แก้ไข
            </Button>
          }
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-16 w-16 shrink-0 items-center justify-center rounded-xl", getCategoryColor(equipment.category.name))}>
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{equipment.name}</h1>
                <EquipmentAvailabilityBadge
                  status={equipment.status}
                  quantity={equipment.quantity}
                  availableQuantity={equipment.availableQuantity}
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-mono">{equipment.code}</span> · {equipment.category.name} · เพิ่มเมื่อ {formatDate(equipment.createdAt)}
              </p>
              {/* Only states that change how the model behaves get a badge. */}
              {(equipment.hiddenFromUsers || !equipment.trackUnits) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {equipment.hiddenFromUsers && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      <EyeOff className="h-3 w-3" />
                      ซ่อนทั้งรุ่นจากผู้ใช้
                    </span>
                  )}
                  {!equipment.trackUnits && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">นับจำนวน (ไม่เก็บรายเครื่อง)</span>
                  )}
                </div>
              )}
              {equipment.description && (
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">{equipment.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {equipment.trackUnits && (
        <Card>
          <CardHeader>
            <CardTitle>รายการเครื่อง</CardTitle>
          </CardHeader>
          <CardContent>
            <UnitsManager equipmentId={equipment.id} code={equipment.code} units={units} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
