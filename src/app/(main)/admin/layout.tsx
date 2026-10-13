import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * Server-side admin check for every /admin page. The middleware checks the role stored in the JWT,
 * which can lag behind a demotion; this re-reads it from the database via the session callback.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") redirect("/");
  return children;
}
