import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditActor = { id: string; name?: string | null };

/** How long log entries are kept. Older ones are pruned automatically (see pruneExpiredLogs). */
export const AUDIT_RETENTION_DAYS = Math.max(30, Number(process.env.AUDIT_RETENTION_DAYS) || 365);

const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
let lastPrunedAt = 0;

/** Delete entries past the retention period. Runs at most once a day per server process. */
async function pruneExpiredLogs() {
  if (Date.now() - lastPrunedAt < PRUNE_INTERVAL_MS) return;
  lastPrunedAt = Date.now();
  const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 86_400_000);
  const { count } = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  if (count > 0) console.log(`[audit] pruned ${count} entries older than ${AUDIT_RETENTION_DAYS} days`);
}

/**
 * Record an admin action. Called after the action succeeded; a logging failure must never
 * undo or fail the action itself, so errors are swallowed (and printed for the server log).
 */
export async function logAudit(
  actor: AuditActor,
  action: string,
  summary: string,
  target?: { type: string; id: string }
) {
  try {
    await db.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name ?? "ผู้ดูแลระบบ",
        action,
        summary,
        targetType: target?.type,
        targetId: target?.id,
      },
    });
    await pruneExpiredLogs();
  } catch (error) {
    console.error("[audit] failed to write log", action, error);
  }
}

export type AuditQuery = {
  /** Action key prefix, e.g. "loan" matches "loan.approve". */
  group?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function buildWhere({ search, from, to }: AuditQuery): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  const q = search?.trim();
  if (q) {
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
    ];
  }
  const createdAt: Prisma.DateTimeFilter = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) createdAt.gte = new Date(`${from}T00:00:00`);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    createdAt.lt = end;
  }
  if (createdAt.gte || createdAt.lt) where.createdAt = createdAt;
  return where;
}

/** One page of entries matching the filters, plus per-group counts for the filter tabs. */
export async function queryAuditLogs(query: AuditQuery) {
  const pageSize = Math.min(100, Math.max(10, query.pageSize ?? 25));
  const base = buildWhere(query);
  const where: Prisma.AuditLogWhereInput = query.group ? { AND: [base, { action: { startsWith: `${query.group}.` } }] } : base;

  const [total, items, byAction] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, query.page ?? 1) - 1) * pageSize,
      take: pageSize,
    }),
    // Counts ignore the group filter so every tab shows how many it would match.
    db.auditLog.groupBy({ by: ["action"], where: base, _count: { _all: true } }),
  ]);

  const groupCounts: Record<string, number> = {};
  let all = 0;
  for (const row of byAction) {
    const group = row.action.split(".")[0];
    groupCounts[group] = (groupCounts[group] ?? 0) + row._count._all;
    all += row._count._all;
  }
  return { items, total, pageSize, groupCounts, all };
}

/** All entries matching the filters, oldest-first, for CSV archiving. */
export function exportAuditLogs(query: AuditQuery) {
  const base = buildWhere(query);
  const where: Prisma.AuditLogWhereInput = query.group ? { AND: [base, { action: { startsWith: `${query.group}.` } }] } : base;
  return db.auditLog.findMany({ where, orderBy: { createdAt: "asc" } });
}

/** "ทดสอบ ระบบ · MacBook Air M2, Webcam C920" for a set of loan line ids. */
export async function describeLoans(ids: string[]) {
  const loans = await db.loan.findMany({
    where: { id: { in: ids } },
    select: { user: { select: { name: true } }, equipment: { select: { name: true } }, quantity: true },
  });
  const borrower = loans[0]?.user?.name ?? "ไม่ทราบผู้ยืม";
  const items = loans.map((l) => `${l.equipment?.name ?? "อุปกรณ์"}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`).join(", ");
  return `${borrower} · ${items}`;
}
