import { UsersRound } from "lucide-react";
import { AdminUsersManager } from "@/components/user/admin-users-manager";
import * as userModel from "@/models/user.model";

export default async function AdminUsersPage() {
  const users = await userModel.findAllForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><UsersRound className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ผู้ใช้งาน</h1>
          <p className="mt-1 text-muted-foreground">อนุมัติผู้สมัครใหม่ และจัดการบัญชี สิทธิ์ แผนก และรหัสผ่านของผู้ใช้</p>
        </div>
      </div>
      <AdminUsersManager users={users} />
    </div>
  );
}