import { redirect } from "next/navigation";

// Editing now happens in a modal; send old links to the equipment detail page.
export default function EditEquipmentPage({ params }: { params: { id: string } }) {
  redirect(`/admin/equipment/${params.id}`);
}
