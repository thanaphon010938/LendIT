import { redirect } from "next/navigation";

// Categories are now managed on the equipment page; keep old links working.
export default function AdminCategoriesPage() {
  redirect("/admin/equipment");
}
