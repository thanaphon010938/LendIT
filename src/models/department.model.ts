import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export function findAllDepartments() {
  return db.department.findMany({ orderBy: { name: "asc" } });
}

export function findDepartmentById(id: string) {
  return db.department.findUnique({ where: { id } });
}

export function findDepartmentByCode(code: string) {
  return db.department.findUnique({ where: { code } });
}

export function findDepartmentByCodeExcludingId(code: string, id: string) {
  return db.department.findFirst({
    where: {
      code,
      NOT: { id },
    },
  });
}

export function createDepartment(data: Prisma.DepartmentCreateInput) {
  return db.department.create({ data });
}

export function updateDepartment(id: string, data: Prisma.DepartmentUpdateInput) {
  return db.department.update({
    where: { id },
    data,
  });
}

export function deleteDepartment(id: string) {
  return db.department.delete({ where: { id } });
}

export function countUsersByDepartmentId(departmentId: string) {
  return db.user.count({ where: { departmentId } });
}
