import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * "Not suspended". Accounts created before isActive existed have no such field in MongoDB, and
 * `NOT: { isActive: false }` does not match a missing field, so match unset/null explicitly.
 */
export const notSuspended = {
  OR: [{ isActive: true }, { isActive: null }, { isActive: { isSet: false } }],
} satisfies Prisma.UserWhereInput;

export function findUserByEmployeeId(employeeId: string) {
  return db.user.findFirst({ where: { employeeId } });
}

export function findUserById(id: string) {
  return db.user.findUnique({ where: { id }, include: { department: true } });
}

export function createUser(data: Prisma.UserCreateInput) {
  return db.user.create({ data });
}

export function findAllForAdmin() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      role: true,
      approvalStatus: true,
      isActive: true,
      approvalNote: true,
      approvedAt: true,
      reviewedByAdminName: true,
      reviewedAt: true,
      passwordResetRequestedAt: true,
      createdAt: true,
      phone: true,
      department: { select: { id: true, code: true, name: true } },
    },
  });
}

export function updatePendingApproval(
  id: string,
  data: Prisma.UserUpdateManyMutationInput
) {
  return db.user.updateMany({ where: { id, approvalStatus: "PENDING" }, data });
}

export function updateUser(id: string, data: Prisma.UserUpdateInput) {
  return db.user.update({ where: { id }, data, include: { department: true } });
}

export function findAllUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      employeeId: true,
      role: true,
      approvalStatus: true,
      isActive: true,
      department: { select: { id: true, code: true, name: true } },
      createdAt: true,
    },
  }).then((users) => users.filter((user) => user.isActive !== false));
}
