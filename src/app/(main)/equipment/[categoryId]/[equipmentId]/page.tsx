import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import * as equipmentService from "@/services/equipment.service";
import * as loanService from "@/services/loan.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EquipmentAvailabilityBadge, LoanStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, cn } from "@/lib/utils";
import { getEquipmentIcon, getCategoryColor } from "@/lib/equipment-icon";
import { ArrowLeft, History } from "lucide-react";

export default async function EquipmentDetailPage({
  params,
}: {
  params: { categoryId: string; equipmentId: string };
}) {
  const session = await getSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const equipment = await equipmentService.getEquipmentDetail(params.equipmentId, { includeHidden: isAdmin });

  if (!equipment) {
    notFound();
  }

  const Icon = getEquipmentIcon(equipment.category.name);
  const canLoan = equipment.status === "ACTIVE" && equipment.availableQuantity > 0;

  // Admins see everyone's recent loans; borrowers only their own, so other people's names never reach the page.
  const history = isAdmin
    ? equipment.loans.map((loan) => ({ ...loan, units: [] as { id: string; assetTag: string }[] }))
    : session
      ? (await loanService.listLoans({ userId: session.user.id })).filter((loan) => loan.equipmentId === equipment.id).slice(0, 10)
      : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/equipment/${params.categoryId}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับไป{equipment.category.name}
      </Link>

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
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {equipment.code} · {equipment.category.name}
              </p>
              {equipment.description && (
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">{equipment.description}</p>
              )}
            </div>
          </div>
          {canLoan && (
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/equipment?equipmentId=${equipment.id}`}>ขอยืมอุปกรณ์นี้</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle>{isAdmin ? "ประวัติการยืม" : "ประวัติการยืมของฉัน"}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState icon={History} title={isAdmin ? "ยังไม่มีประวัติการยืม" : "คุณยังไม่เคยยืมอุปกรณ์นี้"} />
          ) : (
            <div className="flex flex-col gap-1">
              {history.map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {isAdmin && <Avatar name={loan.user?.name ?? "บัญชีผู้ยืมไม่พบ"} size="sm" />}
                    <div>
                      <p className="text-sm font-medium">
                        {isAdmin
                          ? loan.user?.name ?? "บัญชีผู้ยืมไม่พบ"
                          : loan.units.length > 0
                            ? loan.units.map((unit) => unit.assetTag).join(", ")
                            : `${loan.quantity} ชิ้น`}{" "}
                        {isAdmin && <span className="font-normal text-muted-foreground">x{loan.quantity}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ยืม {formatDate(loan.borrowDate)} · กำหนดคืน {formatDate(loan.dueDate)}
                        {loan.returnDate && ` · คืนแล้ว ${formatDate(loan.returnDate)}`}
                      </p>
                    </div>
                  </div>
                  <LoanStatusBadge status={loan.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
