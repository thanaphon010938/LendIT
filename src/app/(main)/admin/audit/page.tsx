import * as auditService from "@/services/audit.service";
import { AuditLogList } from "@/components/admin/audit-log-list";

type SearchParams = { group?: string; q?: string; from?: string; to?: string; page?: string };

export default async function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await auditService.queryAuditLogs({
    group: searchParams.group,
    search: searchParams.q,
    from: searchParams.from,
    to: searchParams.to,
    page,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ประวัติการทำงาน</h1>
        <p className="mt-1 text-muted-foreground">
          บันทึกทุกการทำงานของผู้ดูแลระบบ แก้ไขหรือลบไม่ได้ · เก็บไว้ {auditService.AUDIT_RETENTION_DAYS} วัน หลังจากนั้นลบอัตโนมัติ
          (ดาวน์โหลด CSV เก็บไว้ได้)
        </p>
      </div>
      <AuditLogList
        logs={result.items}
        total={result.total}
        all={result.all}
        groupCounts={result.groupCounts}
        page={page}
        pageSize={result.pageSize}
        filters={{ group: searchParams.group ?? "", q: searchParams.q ?? "", from: searchParams.from ?? "", to: searchParams.to ?? "" }}
      />
    </div>
  );
}
