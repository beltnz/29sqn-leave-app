import { db } from "@/lib/db";
import { headers } from "next/headers";

function getCleanIp(rawIp: string): string {
  const trimmed = (rawIp || "").trim();
  if (trimmed.startsWith("::ffff:")) {
    return trimmed.substring(7);
  }
  if (trimmed === "::1") {
    return "127.0.0.1";
  }
  return trimmed;
}

export async function writeAuditLog(action: string, actor: string, details: string) {
  try {
    let clientIp = "unknown";
    try {
      const headersList = await headers();
      const rawIp = headersList.get("x-forwarded-for")?.split(",")[0] ||
                    headersList.get("x-real-ip") ||
                    "127.0.0.1";
      clientIp = getCleanIp(rawIp);
    } catch (e) {
      // Not in a request context (e.g. bootCheck)
    }

    // 1. Write the audit log entry
    await db.auditLog.create({
      data: {
        action,
        actor,
        details,
        ip: clientIp,
      },
    });

    // 2. Auto-trim logs older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    if (result.count > 0) {
      await db.auditLog.create({
        data: {
          action: "AUDIT_LOG_TRIM",
          actor: "System",
          details: `Automatically purged ${result.count} audit log entries older than 30 days.`,
          ip: "127.0.0.1",
        },
      });
    }
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
