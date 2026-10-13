import Link from "next/link";
import { notFound } from "next/navigation";
import * as categoryService from "@/services/category.service";
import * as equipmentService from "@/services/equipment.service";
import { EquipmentCard } from "@/components/equipment/equipment-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PackageSearch, ArrowLeft } from "lucide-react";

export default async function EquipmentByCategoryPage({
  params,
  searchParams,
}: {
  params: { categoryId: string };
  searchParams: { search?: string };
}) {
  const categories = await categoryService.listCategories();
  const category = categories.find((c) => c.id === params.categoryId);

  if (!category) {
    notFound();
  }

  const equipment = await equipmentService.listEquipment({
    categoryId: params.categoryId,
    search: searchParams.search,
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/equipment" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        กลับไปประเภทอุปกรณ์
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
        <p className="mt-1 text-muted-foreground">ทั้งหมด {equipment.length} รายการ</p>
      </div>

      <form className="flex flex-wrap gap-3" method="get">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            placeholder="ค้นหาชื่อหรือรหัสอุปกรณ์"
            defaultValue={searchParams.search}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="outline">
          ค้นหา
        </Button>
      </form>

      {equipment.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="ยังไม่มีอุปกรณ์ในประเภทนี้"
          description="ลองปรับคำค้นหา หรือเลือกประเภทอื่น"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {equipment.map((item) => (
            <EquipmentCard key={item.id} equipment={item} />
          ))}
        </div>
      )}
    </div>
  );
}
