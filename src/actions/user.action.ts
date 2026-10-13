"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth";
import * as userService from "@/services/user.service";
import { db } from "@/lib/db";
import { logAudit } from "@/services/audit.service";
import { passwordSchema, registerUserSchema, updateProfileSchema } from "@/validations/user.schema";
import type { ActionResult } from "@/actions/equipment.action";
import { redirect } from "next/navigation";
import { z } from "zod";

export async function updateProfileAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const parsed = updateProfileSchema.safeParse({
      departmentId: formData.get("departmentId"),
      phone: formData.get("phone"),
    });

    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
    }

    await userService.updateProfile(user.id, user.role, parsed.data);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/profile");
  return { ok: true, message: "บันทึกข้อมูลโปรไฟล์เรียบร้อย" };
}

export async function registerUserAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  const parsed = registerUserSchema.safeParse({
    employeeId: formData.get("employeeId"),
    name: formData.get("name"),
    departmentId: formData.get("departmentId"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  }
  if (parsed.data.password !== passwordConfirmation) {
    return { ok: false, message: "ยืนยันรหัสผ่านไม่ตรงกัน" };
  }

  try {
    await userService.registerUser(parsed.data);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { ok: false, message: "รหัสพนักงานนี้มีบัญชีในระบบแล้ว" };
    }
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  redirect("/register/pending");
}

export async function decideRegistrationAction(
  userId: string,
  decision: "APPROVED" | "REJECTED",
  note: string,
  role: string
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsedRole = z.enum(["USER", "ADMIN"]).safeParse(role);
    if (decision === "APPROVED" && !parsedRole.success) {
      return { ok: false, message: "กรุณาเลือกสิทธิ์ผู้ใช้งาน" };
    }
    if (decision === "REJECTED" && note.trim().length < 3) {
      return { ok: false, message: "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร" };
    }
    await userService.decideRegistration(
      admin.id,
      admin.name ?? "ผู้ดูแลระบบ",
      userId,
      decision,
      note,
      decision === "APPROVED" && parsedRole.success ? parsedRole.data : "USER"
    );
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/admin/users");
  revalidatePath("/login");
  return { ok: true, message: decision === "APPROVED" ? "อนุมัติผู้ใช้งานแล้ว" : "ปฏิเสธคำขอสมัครแล้ว" };
}

export async function resetOwnPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("passwordConfirmation") ?? "");
    const parsedPassword = passwordSchema.safeParse(password);
    if (!parsedPassword.success) return { ok: false, message: parsedPassword.error.issues[0]?.message ?? "รหัสผ่านไม่ถูกต้อง" };
    if (password !== confirmation) {
      return { ok: false, message: "ยืนยันรหัสผ่านไม่ตรงกัน" };
    }
    await userService.resetOwnPassword(user.id, password);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }

  revalidatePath("/profile");
  return { ok: true, message: "เปลี่ยนรหัสผ่านเรียบร้อย" };
}


// ---- Admin management of approved accounts ----

const userLabel = async (id: string) => {
  const user = await db.user.findUnique({ where: { id }, select: { name: true, employeeId: true } });
  return `${user?.name ?? id} (${user?.employeeId ?? "-"})`;
};

function revalidateUser(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    await userService.setUserActive(admin.id, userId, active);
    await logAudit(admin, active ? "user.activate" : "user.deactivate", `${active ? "เปิดใช้งานบัญชี" : "ระงับบัญชี"} ${await userLabel(userId)}`, {
      type: "user",
      id: userId,
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
  revalidateUser(userId);
  return { ok: true, message: active ? "เปิดใช้งานบัญชีแล้ว" : "ระงับบัญชีแล้ว ผู้ใช้จะถูกออกจากระบบทันที" };
}

export async function setUserRoleAction(userId: string, role: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = z.enum(["USER", "ADMIN"]).safeParse(role);
    if (!parsed.success) return { ok: false, message: "สิทธิ์ไม่ถูกต้อง" };
    await userService.setUserRole(admin.id, userId, parsed.data);
    await logAudit(admin, "user.role", `เปลี่ยนสิทธิ์ ${await userLabel(userId)} เป็น${parsed.data === "ADMIN" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}`, {
      type: "user",
      id: userId,
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
  revalidateUser(userId);
  return { ok: true, message: "เปลี่ยนสิทธิ์แล้ว" };
}

export async function setUserDepartmentAction(userId: string, departmentId: string): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    if (!departmentId) return { ok: false, message: "กรุณาเลือกแผนก" };
    const updated = await userService.setUserDepartment(userId, departmentId);
    await logAudit(admin, "user.department", `ย้ายแผนก ${await userLabel(userId)} ไป ${updated.department.name}`, { type: "user", id: userId });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
  revalidateUser(userId);
  return { ok: true, message: "ย้ายแผนกแล้ว" };
}

/** Returns the temporary password so the admin can hand it over; it is not retrievable later. */
export async function adminResetPasswordAction(userId: string): Promise<ActionResult & { temporaryPassword?: string }> {
  try {
    const admin = await requireAdmin();
    const temporaryPassword = await userService.adminResetPassword(userId);
    await logAudit(admin, "user.reset_password", `รีเซ็ตรหัสผ่าน ${await userLabel(userId)} (ออกรหัสชั่วคราว)`, { type: "user", id: userId });
    revalidateUser(userId);
    return { ok: true, message: "ออกรหัสผ่านชั่วคราวแล้ว", temporaryPassword };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" };
  }
}