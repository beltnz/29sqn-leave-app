import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const failedLoginStore = new Map<string, { count: number; lastFailed: number }>();

/**
 * Auto-removes any blacklisted IP entries older than 30 days.
 */
export async function cleanupExpiredIpRules() {
  try {
    const now = new Date();
    const result = await db.securityIp.deleteMany({
      where: {
        type: "BLACKLIST",
        expiresAt: {
          lt: now,
        },
      },
    });
    if (result.count > 0) {
      await writeAuditLog("IP_RULE_CLEANUP", "System", `Auto-removed ${result.count} expired blacklisted IP rules.`);
      console.log(`Auto-removed ${result.count} expired blacklisted IP rules.`);
    }
  } catch (error) {
    console.error("Failed to clean up expired IP rules:", error);
  }
}

/**
 * Automatically whitelists an IP address associated with an admin user.
 */
export async function autoWhitelistAdminIp(ip: string, adminEmail?: string) {
  try {
    if (!ip || ip === "unknown") return;

    await db.securityIp.upsert({
      where: { ip },
      update: {
        type: "WHITELIST",
        source: "AUTO_ADMIN",
        reason: adminEmail ? `Auto-whitelisted for Admin ${adminEmail}` : "Auto-whitelisted for Admin access",
        expiresAt: null, // Admin whitelists do not expire
      },
      create: {
        ip,
        type: "WHITELIST",
        source: "AUTO_ADMIN",
        reason: adminEmail ? `Auto-whitelisted for Admin ${adminEmail}` : "Auto-whitelisted for Admin access",
        expiresAt: null,
      },
    });
  } catch (error) {
    console.error(`Failed to auto-whitelist admin IP ${ip}:`, error);
  }
}

export function getCleanIp(rawIp: string): string {
  const trimmed = (rawIp || "").trim();
  if (trimmed.startsWith("::ffff:")) {
    return trimmed.substring(7);
  }
  if (trimmed === "::1") {
    return "127.0.0.1";
  }
  return trimmed;
}

/**
 * Checks if an IP is currently blacklisted and not expired.
 */
export async function isIpBlacklisted(rawIp: string): Promise<boolean> {
  if (!rawIp) return false;
  const ip = getCleanIp(rawIp);

  await cleanupExpiredIpRules();

  const rule = await db.securityIp.findUnique({
    where: { ip },
  });

  if (!rule) return false;

  if (rule.type === "BLACKLIST") {
    if (rule.expiresAt && rule.expiresAt < new Date()) {
      return false; // Expired
    }
    return true;
  }

  return false;
}

/**
 * Checks if an IP address is currently whitelisted.
 */
export async function isIpWhitelisted(rawIp: string): Promise<boolean> {
  if (!rawIp) return false;
  const ip = getCleanIp(rawIp);
  const rule = await db.securityIp.findUnique({
    where: { ip },
  });
  return rule?.type === "WHITELIST";
}

/**
 * Records a failed login attempt for an IP.
 * Whitelisted IPs allow infinite tries without blocking.
 * Non-whitelisted IPs are auto-blacklisted for 30 days if failed attempts exceed 5 per day.
 */
export async function recordFailedLoginAttempt(rawIp: string): Promise<{ count: number; isBlocked: boolean }> {
  if (!rawIp) return { count: 1, isBlocked: false };
  const ip = getCleanIp(rawIp);

  // Whitelisted IPs have infinite attempts
  const whitelisted = await isIpWhitelisted(ip);
  if (whitelisted) {
    return { count: 0, isBlocked: false };
  }

  const now = Date.now();
  const record = failedLoginStore.get(ip) || { count: 0, lastFailed: now };

  // Reset counter if last failure was over 24 hours ago
  if (now - record.lastFailed > 86400000) {
    record.count = 0;
  }

  record.count += 1;
  record.lastFailed = now;
  failedLoginStore.set(ip, record);

  // Auto-blacklist IP if failed attempts exceed 5 per day
  if (record.count > 5) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const reason = `Exceeded 5 failed admin login attempts in 24 hours (${record.count} attempts)`;

    await db.securityIp.upsert({
      where: { ip },
      update: {
        type: "BLACKLIST",
        source: "AUTO_FAILSAFE",
        reason,
        expiresAt,
      },
      create: {
        ip,
        type: "BLACKLIST",
        source: "AUTO_FAILSAFE",
        reason,
        expiresAt,
      },
    });

    await writeAuditLog("IP_AUTO_BLOCK", "System", `Automatically blacklisted IP ${ip} for 30 days. Reason: ${reason}`);

    return { count: record.count, isBlocked: true };
  }

  return { count: record.count, isBlocked: false };
}

/**
 * Resets failed attempt counter on successful login.
 */
export function resetFailedLoginAttempts(rawIp: string) {
  if (rawIp) {
    const ip = getCleanIp(rawIp);
    failedLoginStore.delete(ip);
  }
}
