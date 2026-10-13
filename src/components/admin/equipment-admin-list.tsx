"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteEquipmentButton } from "@/components/equipment/delete-equipment-button";
import { CategoryDialog } from "@/components/category/category-form";
import { EquipmentDialog } from "@/components/equipment/equipment-form";
import { DeleteCategoryButton } from "@/components/category/delete-category-button";
import { getEquipmentIcon, getCategoryColor } from "@/lib/equipment-icon";
import { cn } from "@/lib/utils";
import type { UnitStatus } from "@prisma/client";
import { Archive, ChevronRight, EyeOff, LayoutGrid, PackageSearch, Pencil, Plus, Search } from "lucide-react";

type EquipmentRow = {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  description: string | null;
  imageUrl: string | null;
  quantity: number;
  availableQuantity: number;
  status: "ACTIVE" | "RETIRED";
  hiddenFromUsers?: boolean | null;
  trackUnits: boolean;
  /** Non-retired devices (asset-tracked models only). */
  units: AdminUnit[];
  /** Has loan or repair history, so it must be retired rather than deleted. */
  hasHistory: boolean;
};

export type AdminUnit = { assetTag: string; serialNumber: string | null; status: UnitStatus };

const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  AVAILABLE: "ว่าง",
  HELD: "เก็บไว้",
  ON_LOAN: "ถูกยืม",
  IN_REPAIR: "รอซ่อม",
  LOST: "สูญหาย",
  RETIRED: "ปลดระวาง",
};

type CategoryRow = { id: string; name: string };

export function EquipmentAdminList({
  equipment,
  categories,
  initialCategoryId,
}: {
  equipment: EquipmentRow[];
  categories: CategoryRow[];
  initialCategoryId?: string;
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(() =>
    categories.some((category) => category.id === initialCategoryId) ? initialCategoryId! : "all"
  );

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const selectedCategory = categoryId === "all" ? null : categoryById.get(categoryId) ?? null;

  const countByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of equipment) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    return counts;
  }, [equipment]);

  const query = search.trim().toLowerCase();

  const rows = useMemo(() => {
    return equipment
      .filter((item) => categoryId === "all" || item.categoryId === categoryId)
      .map((item) => ({
        ...item,
        // Devices whose asset tag or serial matches, so a sticker or S/N leads straight to its model.
        matchedUnits: query
          ? item.units.filter((u) => u.assetTag.toLowerCase().includes(query) || u.serialNumber?.toLowerCase().includes(query))
          : [],
      }))
      .filter((item) => {
        if (!query) return true;
        const categoryName = categoryById.get(item.categoryId)?.name ?? "";
        return item.matchedUnits.length > 0 || [item.name, item.code, categoryName].some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        const byCategory = (categoryById.get(a.categoryId)?.name ?? "").localeCompare(categoryById.get(b.categoryId)?.name ?? "");
        return byCategory || a.name.localeCompare(b.name);
      });
  }, [categoryById, categoryId, equipment, query]);

  function selectCategory(id: string) {
    setCategoryId(id);
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", id);
    window.history.replaceState(null, "", url);
  }

  const addButton = (
    <EquipmentDialog
      categories={sortedCategories}
      defaultCategoryId={selectedCategory?.id}
      trigger={
        <Button type="button" size="sm" className="group h-9">
          <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
          เพิ่มอุปกรณ์
        </Button>
      }
    />
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Category rail */}
      <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border bg-card p-2 shadow-sm">
          <p className="hidden px-2 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:block">
            ประเภทอุปกรณ์
          </p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="เลือกประเภทอุปกรณ์">
            <CategoryItem
              active={categoryId === "all"}
              onClick={() => selectCategory("all")}
              icon={<LayoutGrid className="h-4 w-4" />}
              iconClass="bg-primary/10 text-primary"
              label="ทั้งหมด"
              count={equipment.length}
            />
            {sortedCategories.map((category) => {
              const Icon = getEquipmentIcon(category.name);
              return (
                <CategoryItem
                  key={category.id}
                  active={categoryId === category.id}
                  onClick={() => selectCategory(category.id)}
                  icon={<Icon className="h-4 w-4" />}
                  iconClass={getCategoryColor(category.name)}
                  label={category.name}
                  count={countByCategory.get(category.id) ?? 0}
                />
              );
            })}
          </nav>
          <div className="mt-2 border-t border-border pt-2">
            <CategoryDialog
              trigger={
                <button
                  type="button"
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" strokeWidth={2.5} />
                  เพิ่มประเภทอุปกรณ์
                </button>
              }
            />
          </div>
        </div>
      </aside>

      {/* Equipment panel */}
      <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {selectedCategory ? (
              (() => {
                const Icon = getEquipmentIcon(selectedCategory.name);
                return (
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", getCategoryColor(selectedCategory.name))}>
                    <Icon className="h-5 w-5" />
                  </span>
                );
              })()
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayoutGrid className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{selectedCategory?.name ?? "อุปกรณ์ทั้งหมด"}</h2>
              <p className="text-xs text-muted-foreground">
                {selectedCategory ? `${countByCategory.get(selectedCategory.id) ?? 0} รายการในประเภทนี้` : `${equipment.length} รายการ จาก ${categories.length} ประเภท`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {selectedCategory && (
              <>
                <CategoryDialog
                  category={selectedCategory}
                  trigger={
                    <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 text-muted-foreground">
                      <Pencil className="h-4 w-4" />
                      เปลี่ยนชื่อ
                    </Button>
                  }
                />
                <DeleteCategoryButton
                  id={selectedCategory.id}
                  name={selectedCategory.name}
                  equipmentCount={countByCategory.get(selectedCategory.id) ?? 0}
                />
                <span className="mx-1 h-6 w-px bg-border" />
              </>
            )}
            {categories.length > 0 && addButton}
          </div>
        </div>

        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <div className="relative md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อ, รหัส, รหัสครุภัณฑ์ หรือ Serial"
              aria-label="ค้นหาอุปกรณ์"
              className="pl-9"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <PackageSearch className="h-6 w-6" />
            </span>
            <div>
              <p className="font-medium">
                {query ? "ไม่พบอุปกรณ์ที่ค้นหา" : selectedCategory ? "ยังไม่มีอุปกรณ์ในประเภทนี้" : "ยังไม่มีอุปกรณ์ในระบบ"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {query ? "ลองค้นหาด้วยชื่อ รหัสครุภัณฑ์ หรือ Serial อื่น" : "เริ่มเพิ่มอุปกรณ์ชิ้นแรกได้เลย"}
              </p>
            </div>
            {!query && categories.length > 0 && addButton}
          </div>
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(0,1fr)_180px_112px] gap-4 border-b border-border px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid">
              <span>อุปกรณ์</span>
              <span>สถานะเครื่อง</span>
              <span className="text-right">จัดการ</span>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((item) => {
                const category = categoryById.get(item.categoryId);
                const categoryName = category?.name ?? "";
                const Icon = getEquipmentIcon(categoryName);
                const retired = item.status === "RETIRED";
                return (
                  <li
                    key={item.id}
                    className="group/row relative grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-primary/[0.04] sm:px-5 md:grid-cols-[minmax(0,1fr)_180px_112px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          retired ? "bg-muted text-muted-foreground" : getCategoryColor(categoryName)
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        {/* Stretched link: the whole row opens the model; controls below sit above it (z-10). */}
                        <Link
                          href={`/admin/equipment/${item.id}`}
                          className={cn(
                            "block truncate font-medium transition-colors after:absolute after:inset-0 after:content-['] group-hover/row:text-primary focus-visible:outline-none focus-visible:after:rounded-sm focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring",
                            retired && "text-muted-foreground"
                          )}
                        >
                          {item.name}
                        </Link>
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="font-mono">{item.code}</span>
                          {!selectedCategory && <span>· {categoryName}</span>}
                          <span className="hidden font-medium text-primary group-hover/row:inline">
                            · {item.trackUnits ? "ดูรายการเครื่อง" : "ดูรายละเอียด"}
                          </span>
                          {retired && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700">
                              <Archive className="h-3 w-3" />
                              ปลดระวาง
                            </span>
                          )}
                          {item.hiddenFromUsers && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                              <EyeOff className="h-3 w-3" />
                              ซ่อนจากผู้ใช้
                            </span>
                          )}
                        </p>
                        {item.matchedUnits.length > 0 && (
                          <div className="relative z-10 mt-1.5 flex flex-wrap gap-1.5">
                            {item.matchedUnits.map((unit) => (
                              <Link
                                key={unit.assetTag}
                                href={`/admin/equipment/${item.id}`}
                                className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary hover:bg-primary/15"
                              >
                                {unit.assetTag}
                                {unit.serialNumber && <span className="text-primary/70"> · S/N {unit.serialNumber}</span>}
                                <span className="font-sans"> · {UNIT_STATUS_LABEL[unit.status]}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <StockSummary item={item} />

                    <div className="col-start-2 row-start-1 flex items-center justify-end gap-0.5 md:col-start-auto md:row-start-auto">
                      <div className="relative z-10 flex items-center gap-0.5">
                      <EquipmentDialog
                        equipment={item}
                        categories={sortedCategories}
                        trigger={
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="แก้ไข" aria-label={`แก้ไข ${item.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      {!item.hasHistory && <DeleteEquipmentButton id={item.id} name={item.name} />}
                      </div>
                      <ChevronRight
                        className="pointer-events-none ml-1 h-5 w-5 text-muted-foreground/50 transition-all group-hover/row:translate-x-0.5 group-hover/row:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
              แสดง {rows.length} จาก {equipment.length} รายการ
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryItem({
  active,
  onClick,
  icon,
  iconClass,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  iconClass: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors lg:w-full",
        active ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", iconClass)}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-primary text-primary-foreground" : count === 0 ? "text-muted-foreground/50" : "bg-muted"
        )}
      >
        {count}
      </span>
    </button>
  );
}

/** At-a-glance stock: a segmented bar plus counts by device status. */
function StockSummary({ item }: { item: EquipmentRow }) {
  const counts = { AVAILABLE: 0, RESERVED: 0, HELD: 0, ON_LOAN: 0, IN_REPAIR: 0, LOST: 0 };
  if (item.trackUnits) {
    for (const unit of item.units) if (unit.status in counts) counts[unit.status as keyof typeof counts] += 1;
    // On the shelf but promised to pending requests: not lendable, same as the borrow page shows.
    counts.RESERVED = Math.max(0, counts.AVAILABLE - item.availableQuantity);
    counts.AVAILABLE = item.availableQuantity;
  } else {
    counts.AVAILABLE = item.availableQuantity;
    counts.ON_LOAN = Math.max(0, item.quantity - item.availableQuantity);
  }
  const total = Math.max(1, counts.AVAILABLE + counts.RESERVED + counts.HELD + counts.ON_LOAN + counts.IN_REPAIR + counts.LOST);
  const segments = counts.AVAILABLE === 0
    ? [{ value: total, className: "bg-slate-300" }]
    : [
    { value: counts.AVAILABLE, className: "bg-emerald-500" },
    { value: counts.RESERVED, className: "bg-amber-400" },
    { value: counts.HELD, className: "bg-amber-200" },
    { value: counts.ON_LOAN, className: "bg-slate-300" },
    { value: counts.IN_REPAIR, className: "bg-rose-400" },
    { value: counts.LOST, className: "bg-slate-400" },
  ];
  const details = [
    counts.RESERVED > 0 && `จอง ${counts.RESERVED}`,
    counts.HELD > 0 && `เก็บไว้ ${counts.HELD}`,
    counts.ON_LOAN > 0 && `${item.trackUnits ? "ยืม" : "ยืม/จอง"} ${counts.ON_LOAN}`,
    counts.IN_REPAIR > 0 && `ซ่อม ${counts.IN_REPAIR}`,
    counts.LOST > 0 && `หาย ${counts.LOST}`,
  ].filter(Boolean);

  return (
    <div className="col-span-2 min-w-0 md:col-span-1" aria-label={`ว่าง ${counts.AVAILABLE} จาก ${item.quantity}`}>
      <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
        <span>
          <span className={cn("font-semibold", counts.AVAILABLE === 0 ? "text-rose-700" : "text-emerald-700")}>
            ว่าง {counts.AVAILABLE}
          </span>
          <span className="text-muted-foreground"> / {item.quantity} {item.trackUnits ? "เครื่อง" : "ชิ้น"}</span>
        </span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
        {segments.map((s, i) =>
          s.value > 0 ? <span key={i} className={s.className} style={{ width: `${(s.value / total) * 100}%` }} /> : null
        )}
      </div>
      {details.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{details.join(" · ")}</p>}
    </div>
  );
}