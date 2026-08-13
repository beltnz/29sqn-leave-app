import { db } from "@/lib/db";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Ensures at least one admin exists in the database.
 * If no admin exists, creates the default admin FLTLT Belt with password '29sqn1941'.
 */
export async function ensureDefaultAdminExists() {
  try {
    const adminCount = await db.member.count({
      where: { isAdmin: true },
    });

    if (adminCount === 0) {
      const defaultAdmin = await db.member.create({
        data: {
          rank: "FLTLT",
          surname: "Belt",
          email: "peter.belt@cadetforces.org.nz",
          password: hashPassword("29sqn1941"),
          isAdjutant: true,
          isManager: true,
          isAdmin: true,
        },
      });
      console.log("Auto-created default admin user:", defaultAdmin.email);
      return defaultAdmin;
    }
  } catch (error) {
    console.error("Error checking/creating default admin:", error);
  }
}

/**
 * Validates whether an admin member can be deleted or have their admin role revoked.
 * Prevents deletion or demotion of the final remaining admin.
 */
export async function validateAdminRoleChange(targetMemberId: number): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const targetMember = await db.member.findUnique({
    where: { id: targetMemberId },
  });

  if (!targetMember) {
    return { allowed: false, reason: "Member not found" };
  }

  if (targetMember.isAdmin) {
    const totalAdmins = await db.member.count({
      where: { isAdmin: true },
    });

    if (totalAdmins <= 1) {
      return {
        allowed: false,
        reason:
          "Operation resisted: Cannot delete or remove the admin role from the final remaining administrator. Promote another member to Admin first.",
      };
    }
  }

  return { allowed: true };
}
