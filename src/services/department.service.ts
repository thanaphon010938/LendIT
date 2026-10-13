import * as departmentModel from "@/models/department.model";

export class DepartmentServiceError extends Error {}

export function listDepartments() {
  return departmentModel.findAllDepartments();
}

export async function createDepartment(input: { code: string; name: string }) {
  const normalizedCode = input.code.trim().toUpperCase();
  const existing = await departmentModel.findDepartmentByCode(normalizedCode);
  if (existing) {
    throw new DepartmentServiceError("รหัสแผนกนี้มีอยู่ในระบบแล้ว");
  }

  return departmentModel.createDepartment({
    code: normalizedCode,
    name: input.name.trim(),
  });
}

export async function updateDepartment(input: { id: string; code: string; name: string }) {
  const department = await departmentModel.findDepartmentById(input.id);
  if (!department) {
    throw new DepartmentServiceError("ไม่พบแผนกที่ต้องการแก้ไข");
  }

  const normalizedCode = input.code.trim().toUpperCase();
  const duplicate = await departmentModel.findDepartmentByCodeExcludingId(normalizedCode, input.id);
  if (duplicate) {
    throw new DepartmentServiceError("รหัสแผนกนี้มีอยู่ในระบบแล้ว");
  }

  return departmentModel.updateDepartment(input.id, {
    code: normalizedCode,
    name: input.name.trim(),
  });
}

export async function deleteDepartment(id: string) {
  const department = await departmentModel.findDepartmentById(id);
  if (!department) {
    throw new DepartmentServiceError("ไม่พบแผนกที่ต้องการลบ");
  }

  const memberCount = await departmentModel.countUsersByDepartmentId(id);
  if (memberCount > 0) {
    throw new DepartmentServiceError("ไม่สามารถลบแผนกที่ยังมีผู้ใช้งานอยู่ได้");
  }

  return departmentModel.deleteDepartment(id);
}
