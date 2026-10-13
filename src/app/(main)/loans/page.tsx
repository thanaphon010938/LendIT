import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import * as loanService from "@/services/loan.service";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { MyLoansManager } from "@/components/loan/my-loans-manager";
import { ClipboardList, Plus } from "lucide-react";

export default async function LoansPage({ searchParams }: { searchParams: { tab?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const loans = await loanService.listLoans({ userId: session.user.id });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">รายการยืม-คืนของฉัน</h1>
          <p className="mt-1 text-muted-foreground">ติดตามสถานะคำขอยืมอุปกรณ์ของคุณ</p>
        </div>
        <Button asChild className="group">
          <Link href="/equipment">
            <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
            ขอยืมอุปกรณ์
          </Link>
        </Button>
      </div>

      {loans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="คุณยังไม่มีรายการยืม"
          description="เริ่มต้นขอยืมอุปกรณ์ได้จากหน้าอุปกรณ์"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/equipment">ไปที่หน้าอุปกรณ์</Link>
            </Button>
          }
        />
      ) : (
        <MyLoansManager loans={loans} initialTab={searchParams.tab} />
      )}
    </div>
  );
}
