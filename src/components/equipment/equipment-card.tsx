import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { EquipmentAvailabilityBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEquipmentIcon, getCategoryColor } from "@/lib/equipment-icon";
import type { EquipmentWithAvailability } from "@/services/equipment.service";

export function EquipmentCard({ equipment }: { equipment: EquipmentWithAvailability }) {
  const Icon = getEquipmentIcon(equipment.category.name);
  const canLoan = equipment.status === "ACTIVE" && equipment.availableQuantity > 0;

  return (
    <Card className="flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-popover">
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", getCategoryColor(equipment.category.name))}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <Link
              href={`/equipment/${equipment.categoryId}/${equipment.id}`}
              className="line-clamp-1 text-sm font-semibold hover:underline"
            >
              {equipment.name}
            </Link>
            <p className="font-mono text-xs text-muted-foreground">{equipment.code}</p>
          </div>
        </div>
        <EquipmentAvailabilityBadge
          status={equipment.status}
          quantity={equipment.quantity}
          availableQuantity={equipment.availableQuantity}
        />
      </CardHeader>
      <CardContent className="flex-1">
        {equipment.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{equipment.description}</p>
        )}
      </CardContent>
      <CardFooter className="gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1">
          <Link href={`/equipment/${equipment.categoryId}/${equipment.id}`}>ดูรายละเอียด</Link>
        </Button>
        {canLoan && (
          <Button asChild size="sm" className="flex-1">
            <Link href={`/equipment?equipmentId=${equipment.id}`}>ขอยืม</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
