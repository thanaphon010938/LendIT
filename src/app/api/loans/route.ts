import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/auth";
import * as loanService from "@/services/loan.service";
import { createLoanSchema } from "@/validations/loan.schema";
import type { LoanStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as LoanStatus | null;

  const loans = await loanService.listLoans({
    status: status ?? undefined,
    userId: user.role === "ADMIN" ? undefined : user.id,
  });

  return NextResponse.json({ data: loans });
}

export async function POST(request: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createLoanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const loans = await loanService.requestLoanGroup(
      user.id,
      parsed.data.equipmentIds.map((equipmentId) => ({ equipmentId, quantity: parsed.data.quantity })),
      { dueDate: parsed.data.dueDate, purpose: parsed.data.purpose },
      { requestGroupId: randomUUID() }
    );
    return NextResponse.json({ data: loans.length === 1 ? loans[0] : loans }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}
