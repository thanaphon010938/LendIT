import { NextRequest, NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/auth";
import * as equipmentService from "@/services/equipment.service";
import { createEquipmentSchema } from "@/validations/equipment.schema";
import type { EquipmentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as EquipmentStatus | null;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const isAdmin = session.user.role === "ADMIN";
  const equipment = await equipmentService.listEquipment(
    {
      status: status ?? undefined,
      categoryId,
      search,
    },
    { includeHidden: isAdmin }
  );

  return NextResponse.json({ data: equipment });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createEquipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const equipment = await equipmentService.createEquipment(parsed.data);
    return NextResponse.json({ data: equipment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
