"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, CheckCircle2, Copy, KeyRound, ShieldCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  adminResetPasswordAction,
  setUserActiveAction,
  setUserDepartmentAction,
  setUserRoleAction,
} from "@/actions/user.action";
import type { ActionResult } from "@/actions/equipment.action";
import { cn } from "@/lib/utils";

type PanelUser = { id: string; name: string; role: Role; isActive: boolean; departmentId: string };
type Department = { id: string; name: string; code: string };

function Feedback({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return (
    <p className={cn("flex items-center gap-1.5 text-xs", result.ok ? "text-emerald-700" : "text-rose-700")} role={result.ok ? "status" : "alert"}>
      {result.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      {result.message}
    </p>
  );
}

function useRun() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>, after?: (r: ActionResult) => void) => {
    setResult(null);
    startTransition(async () => {
      const r = await fn();
      setResult(r);
      after?.(r);
      if (r.ok) router.refresh();
    });
  };
  return { result, isPending, run };
}

function StatusSection({ user, isSelf, activeLoanCount }: { user: PanelUser; isSelf: boolean; activeLoanCount: number }) {
  const [open, setOpen] = useState(false);
  const { result, isPending, run } = useRun();
  const suspending = user.isActive;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">สถานะบัญชี</p>
      <p className="text-xs text-muted-foreground">
        {user.isActive ? "ใช้งานได้ปกติ" : "ถูกระงับ เข้าสู่ระบบไม่ได้"}
      </p>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant={suspending ? "outline" : "success"} size="sm" className="w-full gap-1.5" disabled={isSelf && suspending}>
            {suspending ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {suspending ? "ระงับบัญชี" : "เปิดใช้งานบัญชี"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{suspending ? `ระงับบัญชี ${user.name}` : `เปิดใช้งานบัญชี ${user.name}`}</DialogTitle>
            <DialogDescription>
              {suspending
                ? "ผู้ใช้จะถูกออกจากระบบทันที และเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง ประวัติการยืมยังเก็บไว้ครบ"
                : "ผู้ใช้จะกลับมาเข้าสู่ระบบและยืมอุปกรณ์ได้ตามปกติ"}
            </DialogDescription>
          </DialogHeader>
          {suspending && activeLoanCount > 0 && (
            <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ผู้ใช้นี้ยังมีอุปกรณ์ที่ยืมอยู่ {activeLoanCount} คำขอ อย่าลืมติดตามคืน (แอดมินยังบันทึกคืนให้ได้ตามปกติ)
            </p>
          )}
          <Feedback result={result?.ok ? null : result} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>ยกเลิก</Button>
            </DialogClose>
            <Button
              type="button"
              variant={suspending ? "destructive" : "success"}
              disabled={isPending}
              onClick={() => run(() => setUserActiveAction(user.id, !user.isActive), (r) => r.ok && setOpen(false))}
            >
              {isPending ? "กำลังบันทึก..." : suspending ? "ยืนยันระงับบัญชี" : "ยืนยันเปิดใช้งาน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isSelf && suspending && <p className="text-xs text-muted-foreground">ระงับบัญชีของตัวเองไม่ได้</p>}
      {result?.ok && <Feedback result={result} />}
    </div>
  );
}

function RoleSection({ user, isSelf }: { user: PanelUser; isSelf: boolean }) {
  const [role, setRole] = useState<Role>(user.role);
  const { result, isPending, run } = useRun();
  return (
    <div className="space-y-2">
      <label htmlFor="user-role" className="text-sm font-medium">สิทธิ์การใช้งาน</label>
      <div className="flex gap-2">
        <Select id="user-role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="flex-1" disabled={isSelf}>
          <option value="USER">ผู้ใช้งาน</option>
          <option value="ADMIN">ผู้ดูแลระบบ</option>
        </Select>
        <Button type="button" size="sm" className="h-10" disabled={isSelf || isPending || role === user.role} onClick={() => run(() => setUserRoleAction(user.id, role))}>
          บันทึก
        </Button>
      </div>
      {isSelf && <p className="text-xs text-muted-foreground">เปลี่ยนสิทธิ์ของตัวเองไม่ได้</p>}
      <Feedback result={result} />
    </div>
  );
}

function DepartmentSection({ user, departments }: { user: PanelUser; departments: Department[] }) {
  const [departmentId, setDepartmentId] = useState(user.departmentId);
  const { result, isPending, run } = useRun();
  return (
    <div className="space-y-2">
      <label htmlFor="user-department" className="text-sm font-medium">แผนก</label>
      <div className="flex gap-2">
        <Select id="user-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="flex-1">
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          size="sm"
          className="h-10"
          disabled={isPending || departmentId === user.departmentId}
          onClick={() => run(() => setUserDepartmentAction(user.id, departmentId))}
        >
          บันทึก
        </Button>
      </div>
      <Feedback result={result} />
    </div>
  );
}

function PasswordSection({ user }: { user: PanelUser }) {
  const [open, setOpen] = useState(false);
  const [temporary, setTemporary] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setError("");
    startTransition(async () => {
      const result = await adminResetPasswordAction(user.id);
      if (!result.ok || !result.temporaryPassword) {
        setError(result.message);
        return;
      }
      setTemporary(result.temporaryPassword);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">รหัสผ่าน</p>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setTemporary(null);
            setCopied(false);
            setError("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full gap-1.5">
            <KeyRound className="h-4 w-4" />
            รีเซ็ตรหัสผ่าน
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>รีเซ็ตรหัสผ่าน {user.name}</DialogTitle>
            <DialogDescription>
              {temporary
                ? "ส่งรหัสนี้ให้ผู้ใช้ด้วยตัวเอง รหัสจะแสดงครั้งนี้ครั้งเดียว ผู้ใช้จะถูกขอให้ตั้งรหัสใหม่หลังเข้าสู่ระบบ"
                : "ระบบจะออกรหัสผ่านชั่วคราวให้ รหัสเดิมจะใช้ไม่ได้ทันที"}
            </DialogDescription>
          </DialogHeader>
          {temporary ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <code className="flex-1 select-all font-mono text-lg font-semibold tracking-wider">{temporary}</code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  navigator.clipboard?.writeText(temporary).then(() => setCopied(true));
                }}
              >
                <Copy className="h-4 w-4" />
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </Button>
            </div>
          ) : (
            error && <Feedback result={{ ok: false, message: error }} />
          )}
          <DialogFooter>
            {temporary ? (
              <DialogClose asChild>
                <Button type="button">เสร็จสิ้น</Button>
              </DialogClose>
            ) : (
              <>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isPending}>ยกเลิก</Button>
                </DialogClose>
                <Button type="button" variant="destructive" disabled={isPending} onClick={reset}>
                  {isPending ? "กำลังออกรหัส..." : "ออกรหัสผ่านชั่วคราว"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function UserAdminPanel({
  user,
  isSelf,
  activeLoanCount,
  departments,
}: {
  user: PanelUser;
  isSelf: boolean;
  activeLoanCount: number;
  departments: Department[];
}) {
  return (
    <Card className="h-fit">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <CardTitle>จัดการบัญชี</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <StatusSection user={user} isSelf={isSelf} activeLoanCount={activeLoanCount} />
        <RoleSection user={user} isSelf={isSelf} />
        <DepartmentSection user={user} departments={departments} />
        <PasswordSection user={user} />
      </CardContent>
    </Card>
  );
}
