import * as equipmentService from "@/services/equipment.service";
import * as userModel from "@/models/user.model";
import { getSession } from "@/lib/auth";
import { LoanForm } from "@/components/loan/loan-form";
import { EmptyState } from "@/components/shared/empty-state";
import { CalendarCheck, ClipboardPen, Laptop, PackageCheck, PackageSearch } from "lucide-react";

const steps = [
  { icon: Laptop, title: "เลือกอุปกรณ์", detail: "เลือกประเภทและจำนวน" },
  { icon: ClipboardPen, title: "ระบุวัตถุประสงค์", detail: "บอกเหตุผลการยืม" },
  { icon: CalendarCheck, title: "เลือกวันคืน", detail: "แล้วกดส่งคำขอ" },
];

function BorrowHeader({ models, units }: { models: number; units: number }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-card animate-rise-in sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <PackageCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ยืมอุปกรณ์</h1>
            <p className="mt-1 text-muted-foreground">เลือกอุปกรณ์ที่ต้องการ แล้วส่งคำขอให้ผู้ดูแลอนุมัติ</p>
            {units > 0 && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                พร้อมให้ยืม {models} รุ่น · {units} ชิ้น
              </p>
            )}
          </div>
        </div>

        <ol className="grid grid-cols-3 gap-2 lg:w-[30rem]" aria-label="ขั้นตอนการยืม">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex flex-col items-center gap-1.5 rounded-xl bg-white/70 px-2 py-3 text-center ring-1 ring-inset ring-indigo-100 backdrop-blur-sm motion-safe:animate-rise-in"
              style={{ animationDelay: `${150 + index * 100}ms` }}
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <step.icon className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
              </span>
              <span className="text-xs font-semibold sm:text-sm">{step.title}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{step.detail}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default async function EquipmentPage({ searchParams }: { searchParams: { equipmentId?: string } }) {
  const session = await getSession();
  const [equipmentList, requester] = await Promise.all([
    equipmentService.listLoanableEquipment(),
    session ? userModel.findUserById(session.user.id) : null,
  ]);
  const availableUnits = equipmentList.reduce((sum, item) => sum + item.availableQuantity, 0);

  if (equipmentList.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <BorrowHeader models={0} units={0} />
        <EmptyState icon={PackageSearch} title="ขณะนี้ไม่มีอุปกรณ์ที่พร้อมให้ยืม" description="ลองกลับมาใหม่ภายหลัง หรือติดต่อผู้ดูแลระบบ" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BorrowHeader models={equipmentList.length} units={availableUnits} />

      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <LoanForm
          equipmentList={equipmentList}
          preselectedId={searchParams.equipmentId}
          requesterDepartment={
            requester?.department ?? {
              id: "",
              code: "",
              name: "แผนกของฉัน",
              createdAt: new Date(),
              updatedAt: new Date(),
            }
          }
          borrowerName={session?.user?.name ?? ""}
          requesterPhone={requester?.phone ?? ""}
        />
      </div>
    </div>
  );
}
