import { prisma } from "./prisma";

export interface AuditEntry {
  id: string;
  actorId?: string;
  actorEmail?: string;
  action: string;
  detail?: string;
  ip?: string;
  createdAt: string;
}

export interface LogAuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  detail?: string | null;
  ip?: string | null;
}

/** Write an audit entry. Never throws — auditing must not break the action. */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        detail: input.detail ?? null,
        ip: input.ip ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

export async function getAuditLogs(limit = 200): Promise<AuditEntry[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    actorId: r.actorId ?? undefined,
    actorEmail: r.actorEmail ?? undefined,
    action: r.action,
    detail: r.detail ?? undefined,
    ip: r.ip ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));
}
