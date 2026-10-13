import { db } from "@/lib/db";
import * as equipmentModel from "@/models/equipment.model";
import * as loanModel from "@/models/loan.model";
import * as unitModel from "@/models/equipment-unit.model";
import { getOpenIssueQuantities } from "@/models/equipment-issue.model";
import type { CreateEquipmentInput, UpdateEquipmentInput } from "@/validations/equipment.schema";
import type { Category, Equipment, EquipmentStatus } from "@prisma/client";

export class EquipmentServiceError extends Error {}

export type EquipmentWithAvailability = Equipment & {
  category: Category;
  availableQuantity: number;
};

type AvailabilityInput = Pick<Equipment, "id" | "quantity" | "trackUnits">;

/**
 * Units that can be requested right now.
 * - Asset-tracked: AVAILABLE devices minus units reserved by pending requests.
 * - Stock count: quantity minus pending/approved loans minus units held by open issues.
 */
export async function getAvailableQuantities(items: AvailabilityInput[]): Promise<Map<string, number>> {
  const tracked = items.filter((i) => i.trackUnits).map((i) => i.id);
  const counted = items.filter((i) => !i.trackUnits).map((i) => i.id);

  const [availableUnits, pending, open, issues] = await Promise.all([
    unitModel.countUnitsByStatus(tracked, "AVAILABLE"),
    loanModel.sumLoanQuantities(items.map((i) => i.id), ["PENDING"]),
    loanModel.sumLoanQuantities(counted, ["APPROVED"]),
    getOpenIssueQuantities(counted),
  ]);

  return new Map(
    items.map((item) => {
      const reserved = pending.get(item.id) ?? 0;
      const available = item.trackUnits
        ? (availableUnits.get(item.id) ?? 0) - reserved
        : item.quantity - reserved - (open.get(item.id) ?? 0) - (issues.get(item.id) ?? 0);
      return [item.id, Math.max(0, available)];
    })
  );
}

export async function getAvailableQuantity(item: AvailabilityInput) {
  return (await getAvailableQuantities([item])).get(item.id) ?? 0;
}

async function withAvailability<T extends Equipment & { category: Category }>(
  items: T[]
): Promise<(T & { availableQuantity: number })[]> {
  const available = await getAvailableQuantities(items);
  return items.map((item) => ({ ...item, availableQuantity: available.get(item.id) ?? 0 }));
}

export async function listEquipment(
  params?: {
    status?: EquipmentStatus;
    categoryId?: string;
    search?: string;
  },
  options?: { includeHidden?: boolean }
) {
  const items = await equipmentModel.findAllEquipment(params, options);
  return withAvailability(items);
}

/** Equipment that can currently be requested: ACTIVE status and at least 1 unit free. */
export async function listLoanableEquipment(categoryId?: string) {
  const items = await listEquipment({ status: "ACTIVE", categoryId });
  return items.filter((item) => item.availableQuantity > 0);
}

export async function getEquipmentDetail(id: string, options?: { includeHidden?: boolean }) {
  const equipment = await equipmentModel.findEquipmentById(id);
  if (!equipment) return null;
  if (!options?.includeHidden && equipment.hiddenFromUsers === true) return null;

  return { ...equipment, availableQuantity: await getAvailableQuantity(equipment) };
}

/** Asset tags are "<model code>-NN"; returns the next free number after the highest existing one. */
async function nextAssetTags(equipmentId: string, code: string, count: number) {
  const units = await unitModel.findUnitsByEquipment(equipmentId);
  const prefix = `${code}-`;
  let max = 0;
  for (const unit of units) {
    if (!unit.assetTag.startsWith(prefix)) continue;
    const n = Number(unit.assetTag.slice(prefix.length));
    if (Number.isInteger(n)) max = Math.max(max, n);
  }
  return Array.from({ length: count }, (_, i) => `${prefix}${String(max + i + 1).padStart(2, "0")}`);
}

/** Keep Equipment.quantity equal to the devices still owned, so totals elsewhere stay correct. */
export async function syncTrackedQuantity(equipmentId: string) {
  const owned = await unitModel.countOwnedUnits(equipmentId);
  await equipmentModel.updateEquipment(equipmentId, { quantity: owned });
}

export async function createEquipment(input: CreateEquipmentInput) {
  const existing = await equipmentModel.findEquipmentByCode(input.code);
  if (existing) {
    throw new EquipmentServiceError("รหัสอุปกรณ์นี้มีอยู่ในระบบแล้ว");
  }

  const equipment = await equipmentModel.createEquipment({
    code: input.code,
    name: input.name,
    category: { connect: { id: input.categoryId } },
    description: input.description || null,
    imageUrl: input.imageUrl || null,
    quantity: input.quantity,
    status: input.status,
    hiddenFromUsers: input.hiddenFromUsers,
    trackUnits: input.trackUnits,
  });

  if (input.trackUnits) {
    const tags = await nextAssetTags(equipment.id, equipment.code, input.quantity);
    await db.equipmentUnit.createMany({
      data: tags.map((assetTag) => ({ equipmentId: equipment.id, assetTag })),
    });
  }
  return equipment;
}

export async function updateEquipment(input: UpdateEquipmentInput) {
  const current = await equipmentModel.findEquipmentById(input.id);
  if (!current) throw new EquipmentServiceError("ไม่พบอุปกรณ์");

  // Code and category are fixed after creation: the code prefixes every asset tag, and both
  // anchor loan history. A model entered wrongly is deleted (allowed only if never used) and re-added.
  return equipmentModel.updateEquipment(input.id, {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description || null }),
    ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl || null }),
    // Tracked models derive quantity from their devices; it is changed by adding/retiring units.
    ...(input.quantity !== undefined && !current.trackUnits && { quantity: input.quantity }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.hiddenFromUsers !== undefined && { hiddenFromUsers: input.hiddenFromUsers }),
  });
}

export async function deleteEquipment(id: string) {
  const equipment = await equipmentModel.findEquipmentById(id);
  if (!equipment) {
    throw new EquipmentServiceError("ไม่พบอุปกรณ์");
  }

  // Deleting would orphan loan/repair history (who had which serial). Only never-used models go.
  const [loanCount, issueCount] = await Promise.all([
    db.loan.count({ where: { equipmentId: id } }),
    db.equipmentIssue.count({ where: { equipmentId: id } }),
  ]);
  if (loanCount > 0 || issueCount > 0) {
    throw new EquipmentServiceError("อุปกรณ์นี้มีประวัติการยืมหรือการซ่อมแล้ว ลบไม่ได้ ให้เปลี่ยนสถานะเป็น \"ปลดระวาง\" แทน");
  }

  await db.equipmentUnit.deleteMany({ where: { equipmentId: id } });
  return equipmentModel.deleteEquipment(id);
}

// ---- Individual devices (asset-tracked equipment) ----

export function listUnits(equipmentId: string) {
  return unitModel.findUnitsByEquipment(equipmentId);
}

export async function addUnits(equipmentId: string, count: number, serialNumber?: string) {
  const equipment = await equipmentModel.findEquipmentById(equipmentId);
  if (!equipment || !equipment.trackUnits) throw new EquipmentServiceError("อุปกรณ์นี้ไม่ได้เก็บข้อมูลรายเครื่อง");
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new EquipmentServiceError("จำนวนเครื่องต้องอยู่ระหว่าง 1-100");

  const tags = await nextAssetTags(equipmentId, equipment.code, count);
  await db.equipmentUnit.createMany({
    data: tags.map((assetTag) => ({
      equipmentId,
      assetTag,
      serialNumber: count === 1 && serialNumber?.trim() ? serialNumber.trim() : null,
    })),
  });
  await syncTrackedQuantity(equipmentId);
}

export async function updateUnitDetails(id: string, data: { assetTag: string; serialNumber: string; note: string }) {
  const unit = await unitModel.findUnitById(id);
  if (!unit) throw new EquipmentServiceError("ไม่พบเครื่องนี้");

  const assetTag = data.assetTag.trim();
  const duplicate = await unitModel.findUnitByAssetTag(assetTag);
  if (duplicate && duplicate.id !== id) throw new EquipmentServiceError(`รหัสครุภัณฑ์ ${assetTag} ถูกใช้แล้ว`);

  return unitModel.updateUnit(id, {
    assetTag,
    serialNumber: data.serialNumber.trim() || null,
    note: data.note.trim() || null,
  });
}

/** Taking an AVAILABLE device off the shelf must leave enough for requests already waiting. */
async function assertCanRemoveFromPool(equipmentId: string, action: string) {
  const reserved = (await loanModel.sumLoanQuantities([equipmentId], ["PENDING"])).get(equipmentId) ?? 0;
  const available = (await unitModel.countUnitsByStatus([equipmentId], "AVAILABLE")).get(equipmentId) ?? 0;
  if (available - 1 < reserved) {
    throw new EquipmentServiceError(`${action}ไม่ได้ เพราะเครื่องว่างจะไม่พอสำหรับคำขอที่รออนุมัติ`);
  }
}

/** Take an idle or held device out of service. Devices on loan or in repair go through their own flows. */
export async function retireUnit(id: string) {
  const unit = await unitModel.findUnitById(id);
  if (!unit) throw new EquipmentServiceError("ไม่พบเครื่องนี้");
  if (unit.status !== "AVAILABLE" && unit.status !== "HELD") {
    throw new EquipmentServiceError("ปลดระวางได้เฉพาะเครื่องที่ว่างหรือเก็บไว้ เครื่องที่เสียให้ตัดจำหน่ายจากหน้าอุปกรณ์รอซ่อม");
  }
  if (unit.status === "AVAILABLE") await assertCanRemoveFromPool(unit.equipmentId, "ปลดระวาง");

  await unitModel.updateUnit(id, { status: "RETIRED" });
  await syncTrackedQuantity(unit.equipmentId);
}

/** Keep a device back from lending (e.g. a spare for internal use), or release it again. */
export async function setUnitHeld(id: string, held: boolean) {
  const unit = await unitModel.findUnitById(id);
  if (!unit) throw new EquipmentServiceError("ไม่พบเครื่องนี้");

  if (held) {
    if (unit.status === "HELD") return;
    if (unit.status !== "AVAILABLE") throw new EquipmentServiceError("เก็บไว้ได้เฉพาะเครื่องที่ว่างอยู่");
    await assertCanRemoveFromPool(unit.equipmentId, "เก็บเครื่องนี้ไว้");
    await unitModel.updateUnit(id, { status: "HELD" });
  } else {
    if (unit.status === "AVAILABLE") return;
    if (unit.status !== "HELD") throw new EquipmentServiceError("เครื่องนี้ไม่ได้อยู่ในสถานะเก็บไว้");
    await unitModel.updateUnit(id, { status: "AVAILABLE" });
  }
}
