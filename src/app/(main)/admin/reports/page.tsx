import { ReportExports } from "@/components/admin/report-exports";

export default function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">รายงานและส่งออกข้อมูล</h1>
        <p className="mt-1 text-muted-foreground">
          ดาวน์โหลดเป็นไฟล์ CSV เปิดด้วย Excel ได้ทันที (ภาษาไทยแสดงถูกต้อง) หรือนำเข้า Power BI ผ่าน Get Data → Text/CSV
        </p>
      </div>
      <ReportExports />
    </div>
  );
}
