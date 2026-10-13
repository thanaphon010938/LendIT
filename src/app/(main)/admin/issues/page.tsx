import * as issueService from "@/services/equipment-issue.service";
import { IssuesManager } from "@/components/issue/issues-manager";

export default async function AdminIssuesPage() {
  const issues = await issueService.listIssues();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">อุปกรณ์รอซ่อม</h1>
        <p className="mt-1 text-muted-foreground">
          อุปกรณ์ที่คืนมาเสียหรือสูญหาย จะไม่ถูกนับเป็นของว่างให้ยืมจนกว่าจะบันทึกซ่อมเสร็จหรือตัดจำหน่าย
        </p>
      </div>

      <IssuesManager issues={issues} />
    </div>
  );
}
