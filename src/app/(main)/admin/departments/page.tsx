import Link from "next/link";
import * as departmentService from "@/services/department.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DepartmentForm } from "@/components/department/department-form";
import { DeleteDepartmentButton } from "@/components/department/delete-department-button";
import { Button } from "@/components/ui/button";
import { Building2, Pencil } from "lucide-react";

export default async function AdminDepartmentsPage({
  searchParams,
}: {
  searchParams?: { edit?: string };
}) {
  const departments = await departmentService.listDepartments();
  const editingId = searchParams?.edit ?? "";
  const editingDepartment = departments.find((dept) => dept.id === editingId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">จัดการแผนก</h1>
        <p className="mt-1 text-muted-foreground">รายชื่อแผนกที่ผู้ใช้งานสามารถเลือกในโปรไฟล์ของตนเอง</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสแผนก</TableHead>
              <TableHead>ชื่อแผนก</TableHead>
              <TableHead className="w-28 text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {dept.code}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="ghost" size="icon" title="แก้ไขแผนก">
                      <Link href={`/admin/departments?edit=${dept.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>

                    <DeleteDepartmentButton id={dept.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{editingDepartment ? "แก้ไขแผนก" : "เพิ่มแผนกใหม่"}</CardTitle>
            <CardDescription>รหัสแผนกใช้ภายในระบบ ไม่แสดงให้ผู้ใช้งานเห็น</CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentForm department={editingDepartment} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
