import { Badge } from "@/components/ui/badge";
import type { EquipmentStatus, LoanStatus } from "@prisma/client";

const equipmentStatusLabel: Record<
  EquipmentStatus,
  { label: string; variant: "success" | "warning" | "secondary" | "destructive" }
> = {
  ACTIVE: { label: "ใช้งานได้ปกติ", variant: "success" },
  RETIRED: { label: "ปลดระวาง", variant: "destructive" },
};

const loanStatusLabel: Record<
  LoanStatus,
  { label: string; variant: "success" | "warning" | "secondary" | "destructive" }
> = {
  PENDING: { label: "รออนุมัติ", variant: "warning" },
  APPROVED: { label: "กำลังยืม", variant: "success" },
  REJECTED: { label: "ปฏิเสธ", variant: "destructive" },
  CANCELLED: { label: "ยกเลิกแล้ว", variant: "secondary" },
  RETURNED: { label: "คืนแล้ว", variant: "secondary" },
};

export function EquipmentStatusBadge({ status }: { status: EquipmentStatus }) {
  const { label, variant } = equipmentStatusLabel[status];
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}

/** Combines status + stock count into one badge, e.g. "ว่าง 3/5" or "ถูกยืมหมด". */
export function EquipmentAvailabilityBadge({
  status,
  quantity,
  availableQuantity,
}: {
  status: EquipmentStatus;
  quantity: number;
  availableQuantity: number;
}) {
  if (status === "RETIRED") {
    return (
      <Badge variant="destructive" dot>
        ปลดระวาง
      </Badge>
    );
  }
  if (availableQuantity <= 0) {
    return (
      <Badge variant="warning" dot>
        ถูกยืมหมด
      </Badge>
    );
  }
  return (
    <Badge variant="success" dot>
      ว่าง {availableQuantity}/{quantity}
    </Badge>
  );
}

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  const { label, variant } = loanStatusLabel[status];
  return (
    <Badge variant={variant} dot>
      {label}
    </Badge>
  );
}
