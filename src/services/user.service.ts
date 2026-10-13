import * as userModel from "@/models/user.model";
import * as departmentModel from "@/models/department.model";
import { DEPARTMENT_CODE } from "@/lib/department";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import type { RegisterUserInput, UpdateProfileInput } from "@/validations/user.schema";
import type { Role, UserApprovalStatus } from "@prisma/client";

export class UserServiceError extends Error {}

export async function registerUser(input: RegisterUserInput) {
  const employeeId = input.employeeId.trim().toUpperCase();
  if (await userModel.findUserByEmployeeId(employeeId)) {
    throw new UserServiceError("รหัสพนักงานนี้มีบัญชีในระบบแล้ว");
  }
  const department = await departmentModel.findDepartmentById(input.departmentId);
  if (!department) throw new UserServiceError("ไม่พบแผนกที่เลือก");

  const password = await bcrypt.hash(input.password, 12);
  return userModel.createUser({
    employeeId,
    name: input.name,
    email: null,
    password,
    role: "USER",
    approvalStatus: "PENDING",
    department: { connect: { id: department.id } },
    phone: input.phone || null,
  });
}

export async function decideRegistration(
  adminId: string,
  adminName: string,
  userId: string,
  status: Extract<UserApprovalStatus, "APPROVED" | "REJECTED">,
  note: string,
  approvedRole: Role
) {
  const user = await userModel.findUserById(userId);
  if (!user) throw new UserServiceError("ไม่พบบัญชีผู้ใช้");
  if (user.approvalStatus !== "PENDING") throw new UserServiceError("คำขอนี้ได้รับการพิจารณาไปแล้ว");

  const result = await userModel.updatePendingApproval(userId, {
    approvalStatus: status,
    ...(status === "APPROVED" ? { role: approvedRole } : {}),
    approvalNote: status === "REJECTED" ? note?.trim() : null,
    approvedByAdminId: status === "APPROVED" ? adminId : null,
    approvedAt: status === "APPROVED" ? new Date() : null,
    reviewedByAdminId: adminId,
    reviewedByAdminName: adminName,
    reviewedAt: new Date(),
  });
  if (result.count !== 1) throw new UserServiceError("สถานะคำขอเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่");
}

export async function resetOwnPassword(userId: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 12);
  // Setting their own password ends any admin-issued temporary one.
  return userModel.updateUser(userId, { password: hashedPassword, mustChangePassword: false });
}

// ---- Admin management of approved accounts ----

async function getManagedUser(userId: string) {
  const user = await userModel.findUserById(userId);
  if (!user) throw new UserServiceError("ไม่พบบัญชีผู้ใช้");
  if (user.approvalStatus !== "APPROVED") throw new UserServiceError("จัดการได้เฉพาะบัญชีที่อนุมัติแล้ว");
  return user;
}

/** The system must always keep at least one active admin who can log in. */
async function assertAnotherActiveAdmin(excludingUserId: string) {
  const others = await db.user.count({
    where: { id: { not: excludingUserId }, role: "ADMIN", approvalStatus: "APPROVED", ...userModel.notSuspended },
  });
  if (others === 0) throw new UserServiceError("ต้องมีผู้ดูแลระบบที่ใช้งานได้อย่างน้อย 1 คน");
}

export async function setUserActive(adminId: string, userId: string, active: boolean) {
  const user = await getManagedUser(userId);
  if (!active) {
    if (userId === adminId) throw new UserServiceError("ระงับบัญชีของตัวเองไม่ได้");
    if (user.role === "ADMIN") await assertAnotherActiveAdmin(userId);
  }
  return userModel.updateUser(userId, { isActive: active });
}

export async function setUserRole(adminId: string, userId: string, role: Role) {
  const user = await getManagedUser(userId);
  if (user.role === role) return user;
  if (role === "USER") {
    if (userId === adminId) throw new UserServiceError("ลดสิทธิ์ของตัวเองไม่ได้");
    await assertAnotherActiveAdmin(userId);
  }
  if (role === "ADMIN" && user.department.code !== DEPARTMENT_CODE.IT) {
    throw new UserServiceError("ผู้ดูแลระบบต้องอยู่แผนก IT กรุณาย้ายแผนกเป็น IT ก่อน");
  }
  return userModel.updateUser(userId, { role });
}

export async function setUserDepartment(userId: string, departmentId: string) {
  const user = await getManagedUser(userId);
  const department = await departmentModel.findDepartmentById(departmentId);
  if (!department) throw new UserServiceError("ไม่พบแผนกที่เลือก");
  if (user.role === "ADMIN" && department.code !== DEPARTMENT_CODE.IT) {
    throw new UserServiceError("บัญชีผู้ดูแลระบบต้องอยู่แผนก IT เท่านั้น");
  }
  return userModel.updateUser(userId, { department: { connect: { id: department.id } } });
}

/** Readable temporary password (no 0/O/1/l look-alikes). Shown to the admin once, never stored in plain text. */
function generateTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const pick = (set: string) => set[randomInt(set.length)];
  // Guarantee the same character classes the password rules expect.
  const base = [pick("ABCDEFGHJKLMNPQRSTUVWXYZ"), pick("abcdefghjkmnpqrstuvwxyz"), pick("23456789"), pick("!@#$%")];
  while (base.length < 10) base.push(pick(chars));
  for (let i = base.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.join("");
}

export async function adminResetPassword(userId: string) {
  await getManagedUser(userId);
  const temporary = generateTemporaryPassword();
  await userModel.updateUser(userId, {
    password: await bcrypt.hash(temporary, 12),
    mustChangePassword: true,
    passwordResetRequestedAt: null,
  });
  return temporary;
}


export async function updateProfile(userId: string, role: Role, input: UpdateProfileInput) {
  const department = await departmentModel.findDepartmentById(input.departmentId);
  if (!department) {
    throw new UserServiceError("ไม่พบแผนกที่เลือก");
  }

  if (role === "ADMIN" && department.code !== DEPARTMENT_CODE.IT) {
    throw new UserServiceError("บัญชีผู้ดูแลระบบต้องอยู่แผนก IT เท่านั้น");
  }

  return userModel.updateUser(userId, {
    department: { connect: { id: department.id } },
    phone: input.phone || null,
  });
}
