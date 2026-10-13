import { redirect } from "next/navigation";

// Adding equipment now happens in a modal on the equipment page; keep old links working.
export default function NewEquipmentPage({ searchParams }: { searchParams: { categoryId?: string } }) {
  redirect(searchParams.categoryId ? `/admin/equipment?category=${searchParams.categoryId}` : "/admin/equipment");
}
