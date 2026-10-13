import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import * as userModel from "@/models/user.model";
import * as departmentService from "@/services/department.service";
import { DEPARTMENT_CODE } from "@/lib/department";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/user/profile-form";
import { PasswordResetForm } from "@/components/user/password-reset-form";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const [user, departments] = await Promise.all([
    userModel.findUserById(session.user.id),
    departmentService.listDepartments(),
  ]);
  const itDepartment = departments.find((d) => d.code === DEPARTMENT_CODE.IT);

  if (!user || !itDepartment) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">โปรไฟล์ของฉัน</h1>
        <p className="mt-1 text-muted-foreground">ข้อมูลแผนกและเบอร์ติดต่อใช้สำหรับการขอยืมอุปกรณ์ของคุณ</p>
      </div>

      <Card className="max-w-lg">
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar name={user.name} size="lg" />
          <div>
            <p className="font-semibold">{user.name}</p>
            {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
            <p className="text-xs text-muted-foreground">รหัสพนักงาน {user.employeeId ?? "ยังไม่ระบุ"}</p>
            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="mt-1.5">
              {user.role === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>ตั้งรหัสผ่านใหม่</CardTitle>
          <CardDescription>เปลี่ยนรหัสผ่านของบัญชีที่กำลังเข้าสู่ระบบ</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordResetForm />
        </CardContent>
      </Card>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>ข้อมูลแผนกและการติดต่อ</CardTitle>
          <CardDescription>ข้อมูลนี้จะผูกกับบัญชีของคุณถาวร และใช้ในทุกคำขอยืมในอนาคต</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            role={user.role}
            departmentId={user.departmentId}
            itDepartment={itDepartment}
            departments={departments}
            phone={user.phone}
          />
        </CardContent>
      </Card>
    </div>
  );
}
