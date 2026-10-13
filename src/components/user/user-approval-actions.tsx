"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, X } from "lucide-react";
import { decideRegistrationAction } from "@/actions/user.action";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Role } from "@prisma/client";
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

export function UserApprovalActions({ userId, userName }: { userId: string; userName: string }) {
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [reason, setReason] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!decision) return;
    if (decision === "REJECTED" && reason.trim().length < 3) {
      setError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await decideRegistrationAction(userId, decision, reason, role);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDecision(null);
      setReason("");
      setRole("USER");
      router.refresh();
    });
  }

  function close(nextOpen: boolean) {
    if (!nextOpen) {
      setDecision(null);
      setReason("");
      setRole("USER");
      setError("");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={decision === "APPROVED"} onOpenChange={close}>
        <DialogTrigger asChild>
          <Button size="sm" variant="success" onClick={() => setDecision("APPROVED")}>อนุมัติ</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>อนุมัติบัญชีผู้ใช้งาน</DialogTitle>
            <DialogDescription>อนุมัติ {userName} และกำหนดสิทธิ์สำหรับการเข้าใช้งาน</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor={`approve-role-${userId}`} className="text-sm font-medium">สิทธิ์ผู้ใช้งาน</label>
            <Select id={`approve-role-${userId}`} value={role} onChange={(event) => setRole(event.target.value as Role)}>
              <option value="USER">ผู้ใช้งาน</option>
              <option value="ADMIN">ผู้ดูแลระบบ</option>
            </Select>
            <p className="text-xs text-muted-foreground">ผู้ดูแลระบบสามารถเข้าถึงเมนูจัดการและอนุมัติบัญชีได้</p>
          </div>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={pending}>กลับ</Button></DialogClose>
            <Button variant="success" disabled={pending} onClick={submit}>{pending ? "กำลังอนุมัติ..." : <><Check className="h-4 w-4" /> ยืนยันอนุมัติ</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={decision === "REJECTED"} onOpenChange={close}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" onClick={() => setDecision("REJECTED")}>ปฏิเสธ</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอสมัคร</DialogTitle>
            <DialogDescription>ระบุเหตุผลให้ {userName} ทราบ บัญชีนี้จะไม่สามารถเข้าสู่ระบบได้</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor={`reject-user-${userId}`} className="text-sm font-medium">เหตุผล</label>
            <Textarea id={`reject-user-${userId}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
          </div>
          {error && <p role="alert" className="flex items-center gap-2 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{error}</p>}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={pending}>กลับ</Button></DialogClose>
            <Button variant="destructive" disabled={pending || reason.trim().length < 3} onClick={submit}>{pending ? "กำลังปฏิเสธ..." : <><X className="h-4 w-4" /> ยืนยันปฏิเสธ</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}