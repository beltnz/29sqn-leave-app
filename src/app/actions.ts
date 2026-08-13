"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import {
  CreateLeaveRequestSchema,
  UpdateLeaveStatusSchema,
  CreateMemberSchema,
  CreateSecurityIpSchema,
  sanitizeText,
} from "@/lib/validations";
import { checkRateLimit } from "@/lib/ratelimit";
import { ensureDefaultAdminExists, validateAdminRoleChange, hashPassword, verifyPassword } from "@/lib/auth";
import {
  autoWhitelistAdminIp,
  cleanupExpiredIpRules,
  isIpBlacklisted,
  isIpWhitelisted,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
} from "@/lib/ipSecurity";
import { writeAuditLog } from "@/lib/audit";
import { formatNZTime, formatNZDisplayDate, getNZTodayString, findFirstParadeNightDate, findLastParadeNightDate } from "@/lib/dateUtils";
import { sendEmail } from "@/lib/email";
import {
  DEFAULT_LEAVE_NOTIFICATION_TEMPLATE,
  parseTemplateJson,
  renderLeaveNotificationEmail,
  calculateDuration,
  calculateParadeNights,
} from "@/lib/emailTemplates";

/**
 * Ensures default admin exists on server invocation.
 */
let isBooted = false;

async function bootCheck() {
  await ensureDefaultAdminExists();
  if (!isBooted) {
    isBooted = true;
  }
}

async function getActorName(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;
    if (sessionCookie) {
      const payload = JSON.parse(sessionCookie);
      if (payload?.memberId) {
        const member = await db.member.findUnique({
          where: { id: payload.memberId },
        });
        if (member) {
          return `Admin ${member.rank} ${member.surname}`;
        }
      }
    }
  } catch (e) {
    // Ignore session read errors
  }
  return "System";
}

/* =========================================================================
   ADMIN AUTHENTICATION & SESSION MANAGEMENT ACTIONS
   ========================================================================= */

export async function getAdminSession() {
  await bootCheck();
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;

    if (!sessionCookie) {
      return { authenticated: false };
    }

    const payload = JSON.parse(sessionCookie);
    if (!payload?.memberId) {
      return { authenticated: false };
    }

    const member = await db.member.findUnique({
      where: { id: payload.memberId },
    });

    if (!member || !member.isActive || !member.isAdmin) {
      return { authenticated: false };
    }

    return { authenticated: true, member };
  } catch (error) {
    return { authenticated: false };
  }
}

export async function getAdjutantSession() {
  await bootCheck();
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;

    if (!sessionCookie) {
      return { authenticated: false };
    }

    const payload = JSON.parse(sessionCookie);
    if (!payload?.memberId || !payload?.loggedInAt) {
      return { authenticated: false };
    }

    const member = await db.member.findUnique({
      where: { id: payload.memberId },
    });

    if (!member || !member.isActive) {
      return { authenticated: false };
    }

    if (!member.isAdjutant && !member.isManager && !member.isAdmin) {
      return { authenticated: false };
    }

    // Auto-logout adjutants if an Admin logged in after this adjutant session was established
    if (!member.isAdmin) {
      const lastAdminLoginSetting = await getSystemSetting("last_admin_login_at");
      if (lastAdminLoginSetting) {
        const lastAdminLoginTime = parseInt(lastAdminLoginSetting, 10);
        if (payload.loggedInAt < lastAdminLoginTime) {
          cookieStore.delete("admin_session");
          await writeAuditLog(
            "LOGOUT",
            "System",
            `Adjutant session for ${member.rank} ${member.surname} (${member.email}) automatically logged out due to Administrator login`
          );
          return { authenticated: false };
        }
      }
    }

    return { authenticated: true, member };
  } catch (error) {
    return { authenticated: false };
  }
}

export async function getPortalSession() {
  await bootCheck();
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin_session")?.value;

    if (!sessionCookie) {
      return { authenticated: false };
    }

    const payload = JSON.parse(sessionCookie);
    if (!payload?.memberId || !payload?.loggedInAt) {
      return { authenticated: false };
    }

    const member = await db.member.findUnique({
      where: { id: payload.memberId },
    });

    if (!member || !member.isActive) {
      return { authenticated: false };
    }

    if (!member.isAdmin && !member.isAdjutant && !member.isManager) {
      return { authenticated: false };
    }

    // Auto-logout adjutants if an Admin logged in after this adjutant session was established
    if (!member.isAdmin) {
      const lastAdminLoginSetting = await getSystemSetting("last_admin_login_at");
      if (lastAdminLoginSetting) {
        const lastAdminLoginTime = parseInt(lastAdminLoginSetting, 10);
        if (payload.loggedInAt < lastAdminLoginTime) {
          cookieStore.delete("admin_session");
          await writeAuditLog(
            "LOGOUT",
            "System",
            `Adjutant session for ${member.rank} ${member.surname} (${member.email}) automatically logged out due to Administrator login`
          );
          return { authenticated: false };
        }
      }
    }

    return { authenticated: true, member };
  } catch (error) {
    return { authenticated: false };
  }
}

export async function loginAdmin(rawData: { username?: string; surname?: string; password: string; clientIp?: string }) {
  await bootCheck();

  const handleInput = rawData.username || rawData.surname || "";
  const parseResult = (await import("@/lib/validations")).AdminLoginSchema.safeParse({
    username: handleInput,
    password: rawData.password,
    clientIp: rawData.clientIp,
  });

  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid credentials format",
    };
  }

  const { username, password, clientIp } = parseResult.data;
  const ip = clientIp || "127.0.0.1";

  // Extract handle before '@' if provided
  const inputHandle = username.split("@")[0].trim().toLowerCase();

  // Check if IP is blacklisted
  const blacklisted = await isIpBlacklisted(ip);
  if (blacklisted) {
    await writeAuditLog("IP_BLOCKED_ACCESS_REFUSED", "Visitor", `Access Refused: Blocked login attempt from blacklisted IP: ${ip}`);
    return {
      success: false,
      error: "Access Blocked: Your IP address has been temporarily blacklisted due to excessive failed attempts.",
    };
  }

  // Find member by email prefix (part in front of @) who is either Admin, Adjutant, or Manager
  const members = await db.member.findMany({
    where: {
      OR: [
        { isAdmin: true },
        { isAdjutant: true },
        { isManager: true },
      ],
    },
  });

  const member = members.find((m) => {
    const emailPrefix = (m.email || "").split("@")[0].trim().toLowerCase();
    return emailPrefix === inputHandle;
  });

  if (member && !member.isActive) {
    await writeAuditLog("LOGIN_FAIL", `IP ${ip}`, `Attempted login to inactive account for username '${inputHandle}'`);
    return {
      success: false,
      error: "Access Denied: This account is currently inactive. Please contact the system administrator.",
    };
  }

  const isPasswordValid = member ? verifyPassword(password, member.password) : false;

  if (!member || !isPasswordValid) {
    // Record failed login attempt
    const failRecord = await recordFailedLoginAttempt(ip);

    await writeAuditLog("LOGIN_FAIL", `IP ${ip}`, `Failed login attempt for username '${inputHandle}'`);

    if (failRecord.isBlocked) {
      return {
        success: false,
        error: "Exceeded 5 failed login attempts today. Your IP address has been blocked for 30 days.",
      };
    }

    const whitelisted = await isIpWhitelisted(ip);
    const triesMsg = whitelisted
      ? "Whitelisted IP (Infinite attempts allowed)."
      : `${Math.max(0, 5 - failRecord.count)} attempt(s) remaining today before IP block.`;

    return {
      success: false,
      error: `Invalid username or password. ${triesMsg}`,
    };
  }

  // Login Successful: Reset failed attempts & auto-whitelist admin IP if admin
  resetFailedLoginAttempts(ip);
  const loginTimestamp = Date.now();

  if (member.isAdmin) {
    await autoWhitelistAdminIp(ip, member.email);
    // Update system setting for last admin login time to automatically log out any active adjutants
    await updateSystemSetting("last_admin_login_at", loginTimestamp.toString());
  }

  const roleLabel = member.isAdmin ? "Admin" : member.isAdjutant ? "Adjutant" : "Manager";
  const detailsMsg = member.isAdmin
    ? `Admin ${member.rank} ${member.surname} (${member.email}) successfully logged in (Any active Adjutant sessions automatically terminated)`
    : `${roleLabel} ${member.rank} ${member.surname} (${member.email}) successfully logged in`;

  await writeAuditLog("LOGIN_SUCCESS", `IP ${ip}`, detailsMsg);

  // Set HTTP-only session cookie
  const cookieStore = await cookies();
  cookieStore.set("admin_session", JSON.stringify({ memberId: member.id, loggedInAt: loginTimestamp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  revalidatePath("/admin");
  revalidatePath("/adjutant");

  return { success: true, member };
}

export async function logoutAdmin(reason?: string) {
  const actor = await getActorName();
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  revalidatePath("/admin");
  const details = reason === "inactivity"
    ? "Admin automatically logged out due to 5-minute inactivity timeout"
    : "Admin manually logged out";
  await writeAuditLog("ADMIN_LOGOUT", actor, details);
  return { success: true };
}

export async function getMembers() {
  await bootCheck();
  try {
    const members = await db.member.findMany({
      orderBy: { surname: "asc" },
    });

    const sortedMembers = members.sort((a, b) => {
      const getRolePriority = (m: typeof a) => {
        if (m.isAdmin) return 1;
        if (m.isAdjutant || m.isManager) return 2;
        if (m.isStaff) return 3;
        return 4;
      };

      const priorityA = getRolePriority(a);
      const priorityB = getRolePriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return a.surname.localeCompare(b.surname, undefined, { sensitivity: "base" });
    });

    return { success: true, data: sortedMembers };
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return { success: false, error: "Failed to fetch members" };
  }
}

export async function createMember(rawData: {
  rank?: string;
  surname: string;
  email: string;
  password?: string;
  isStaff?: boolean;
  isAdjutant?: boolean;
  isManager?: boolean;
  isAdmin?: boolean;
}) {
  await bootCheck();
  const rateCheck = checkRateLimit("createMember", 20, 60000);
  if (!rateCheck.success) {
    return { success: false, error: "Rate limit exceeded. Please wait before adding more personnel." };
  }

  const parseResult = CreateMemberSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid member data provided",
    };
  }

  const { rank, surname, email, password, isStaff, isAdjutant, isManager, isAdmin } = parseResult.data;

  // Explicit check for unique email address
  const existingByEmail = await db.member.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingByEmail) {
    return {
      success: false,
      error: `An account with email '${email}' is already registered (${existingByEmail.rank} ${existingByEmail.surname}). Email addresses must be unique.`,
    };
  }

  try {
    const newMember = await db.member.create({
      data: {
        rank,
        surname,
        email: email.toLowerCase(),
        password: hashPassword(password || "29sqn1941"),
        isStaff: isStaff ?? false,
        isAdjutant: isAdjutant || isManager,
        isManager: isAdjutant || isManager,
        isAdmin: isAdmin ?? false,
        isActive: true,
        emailEnabled: false,
      },
    });

    if (isAdmin) {
      await autoWhitelistAdminIp("127.0.0.1", email);
    }

    try {
      revalidatePath("/admin");
      revalidatePath("/adjutant");
      revalidatePath("/");
    } catch (e) {
      // Ignored outside Next.js request context
    }

    const actor = await getActorName();
    await writeAuditLog("MEMBER_CREATE", actor, `Created pre-approved account for ${rank} ${surname} (${email})`);

    return { success: true, data: newMember };
  } catch (error: any) {
    console.error("Failed to create member:", error);
    return {
      success: false,
      error: `Failed to create member: ${error?.message || "Database constraint error"}`,
    };
  }
}

export async function updateMemberPassword(memberId: number, newPassword: string) {
  await bootCheck();
  const rateCheck = checkRateLimit("updateMemberPassword", 20, 60000);
  if (!rateCheck.success) {
    return { success: false, error: "Rate limit exceeded. Please wait a minute before updating passwords again." };
  }

  const parseResult = (await import("@/lib/validations")).UpdateMemberPasswordSchema.safeParse({
    memberId,
    newPassword,
  });

  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid password update data",
    };
  }

  const { memberId: validId, newPassword: validPassword } = parseResult.data;

  try {
    const member = await db.member.findUnique({
      where: { id: validId },
    });

    if (!member) {
      return { success: false, error: "Adjutant account not found" };
    }

    await db.member.update({
      where: { id: validId },
      data: {
        password: hashPassword(validPassword),
      },
    });

    revalidatePath("/admin");
    revalidatePath("/adjutant");

    const actor = await getActorName();
    await writeAuditLog("PASSWORD_UPDATE", actor, `Updated ${member.rank} ${member.surname} detail: password, oldvalue=***, newvalue=***`);

    return {
      success: true,
      message: `Password successfully updated for ${member.rank} ${member.surname} (${member.email}).`,
    };
  } catch (error) {
    console.error(`Failed to update password for member ${memberId}:`, error);
    return { success: false, error: "Failed to update adjutant password" };
  }
}

export async function updateMember(rawData: {
  id: number;
  rank?: string;
  surname: string;
  email: string;
  password?: string;
  isStaff?: boolean;
  isAdjutant?: boolean;
  isManager?: boolean;
  isAdmin?: boolean;
}) {
  await bootCheck();
  const rateCheck = checkRateLimit("updateMember", 20, 60000);
  if (!rateCheck.success) {
    return { success: false, error: "Rate limit exceeded. Please wait before updating accounts." };
  }

  const parseResult = (await import("@/lib/validations")).UpdateMemberSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid member data provided",
    };
  }

  const { id, rank, surname, email, password, isStaff, isAdjutant, isManager, isAdmin } = parseResult.data;

  // Check if target email belongs to another account
  const existingByEmail = await db.member.findFirst({
    where: {
      email: email.toLowerCase(),
      NOT: { id },
    },
  });

  if (existingByEmail) {
    return {
      success: false,
      error: `Email address '${email}' is already registered to another account (${existingByEmail.rank} ${existingByEmail.surname}).`,
    };
  }

  // Final Admin Deletion/Demotion Resistance Rule
  if (isAdmin === false) {
    const authCheck = await validateAdminRoleChange(id);
    if (!authCheck.allowed) {
      return { success: false, error: authCheck.reason };
    }
  }

  try {
    const oldMember = await db.member.findUnique({
      where: { id },
    });
    if (!oldMember) {
      return { success: false, error: "Member not found" };
    }

    const updateData: Record<string, any> = {
      rank,
      surname,
      email,
      isStaff: isStaff ?? false,
      isAdjutant: isAdjutant || isManager,
      isManager: isAdjutant || isManager,
      isAdmin: isAdmin ?? false,
    };

    if (password && password.trim().length >= 4) {
      updateData.password = hashPassword(password.trim());
    }

    const updatedMember = await db.member.update({
      where: { id },
      data: updateData,
    });

    if (isAdmin) {
      await autoWhitelistAdminIp("127.0.0.1", email);
    }

    revalidatePath("/admin");
    revalidatePath("/adjutant");

    const actor = await getActorName();
    
    // Compare changed fields
    const changes: string[] = [];
    const fieldsToCompare = [
      { name: "rank", label: "rank" },
      { name: "surname", label: "surname" },
      { name: "email", label: "email" },
      { name: "isStaff", label: "isStaff" },
      { name: "isAdjutant", label: "isAdjutant" },
      { name: "isManager", label: "isManager" },
      { name: "isAdmin", label: "isAdmin" },
    ];

    for (const field of fieldsToCompare) {
      const oldVal = (oldMember as any)[field.name];
      const newVal = updateData[field.name];
      if (oldVal !== newVal) {
        changes.push(`${field.label}, oldvalue=${oldVal}, newvalue=${newVal}`);
      }
    }

    if (updateData.password) {
      changes.push("password, oldvalue=***, newvalue=***");
    }

    const detailsStr = changes.length > 0
      ? `Updated account #${id} (${updatedMember.rank} ${updatedMember.surname}) details: ${changes.join("; ")}`
      : `Updated details of account #${id} (${updatedMember.rank} ${updatedMember.surname}) (no values changed)`;

    await writeAuditLog("MEMBER_UPDATE", actor, detailsStr);

    return { success: true, data: updatedMember };
  } catch (error) {
    console.error(`Failed to update member ${rawData.id}:`, error);
    return { success: false, error: "Failed to update member details. Email may already be in use." };
  }
}

export async function deleteMember(id: number) {
  await bootCheck();

  // Enforce Final Admin Deletion Resistance Rule
  const authCheck = await validateAdminRoleChange(id);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.reason };
  }

  try {
    const member = await db.member.findUnique({ where: { id } });
    const memberDesc = member ? `${member.rank} ${member.surname}` : `#${id}`;

    await db.member.delete({
      where: { id },
    });

    revalidatePath("/admin");
    revalidatePath("/adjutant");
    revalidatePath("/");

    const actor = await getActorName();
    await writeAuditLog("MEMBER_DELETE", actor, `Deleted pre-approved account for ${memberDesc}`);

    return { success: true };
  } catch (error) {
    console.error(`Failed to delete member ${id}:`, error);
    return { success: false, error: "Failed to delete member account" };
  }
}

export async function getLeaveRequests() {
  await bootCheck();
  try {
    const requests = await db.leaveRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: requests };
  } catch (error) {
    console.error("Failed to fetch leave requests:", error);
    return { success: false, error: "Failed to fetch leave requests" };
  }
}

export async function createLeaveRequest(rawData: {
  rank?: string;
  surname: string;
  startDate: Date | string;
  endDate: Date | string;
  reason: string;
  website_hp?: string;
}) {
  await bootCheck();

  // Honeypot Bot Trap Check
  if (rawData.website_hp && rawData.website_hp.trim() !== "") {
    return { success: true };
  }

  const rateCheck = checkRateLimit("createLeaveRequest", 10, 60000);
  if (!rateCheck.success) {
    return {
      success: false,
      error: "Rate limit exceeded. Please wait a minute before submitting another request.",
    };
  }

  const parseResult = CreateLeaveRequestSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid leave request inputs",
    };
  }

  const { rank, surname, startDate, endDate, reason } = parseResult.data;

  try {
    const newRequest = await db.leaveRequest.create({
      data: {
        rank,
        surname,
        startDate,
        endDate,
        reason,
        status: "LOGGED",
      },
    });

    revalidatePath("/requests");
    revalidatePath("/adjutant");
    revalidatePath("/");

    const startStr = formatNZDisplayDate(startDate);
    const endStr = formatNZDisplayDate(endDate);
    await writeAuditLog("LEAVE_CREATE", `${rank} ${surname}`, `Logged leave notification for ${startStr} to ${endStr} (Reason: ${reason})`);

    // ── Notification Email Dispatch ──────────────────────────────────────
    // Non-fatal: leave submission succeeds regardless of email outcome.
    try {
      const recipients = await db.member.findMany({
        where: { isActive: true, emailEnabled: true },
        select: { email: true, rank: true, surname: true },
      });

      if (recipients.length > 0) {
        const bccList = recipients.map((m) => m.email).join(", ");
        const fromAddress = (process.env.SMTP_FROM || "donotreply@29squadron.org.nz").trim().replace(/^["']|["']$/g, "");
        const unitName = (await getSystemSetting("unit_name")) || "29 Squadron";

        // Load custom template from DB, fall back to default if not set.
        const rawTemplate = await getSystemSetting("leave_notification_template");
        const template = (rawTemplate && parseTemplateJson(rawTemplate)) || DEFAULT_LEAVE_NOTIFICATION_TEMPLATE;

        // Compute duration and parade nights affected.
        const paradeNightDay = (await getSystemSetting("parade_night")) || "Wednesday";
        const termYearsRes = await db.termYear.findMany({ orderBy: { year: "asc" } });
        // Build flat list of all [tNStart, tNEnd] term ranges across all years.
        const termRanges = termYearsRes.flatMap((ty) => [
          { start: ty.t1Start, end: ty.t1End },
          { start: ty.t2Start, end: ty.t2End },
          { start: ty.t3Start, end: ty.t3End },
          { start: ty.t4Start, end: ty.t4End },
        ]).filter((r) => r.start && r.end);

        const durationDays = calculateDuration(startDate, endDate);
        const paradeNightsCount = calculateParadeNights(startDate, endDate, paradeNightDay, termRanges);

        const { subject, body, html } = renderLeaveNotificationEmail(template, {
          rank,
          surname,
          startDate: startStr,
          endDate: endStr,
          reason,
          submittedAt: formatNZTime(new Date()),
          unitName,
          duration: String(durationDays),
          paradeNights: paradeNightsCount === 0
            ? `0 (no ${paradeNightDay} parade nights fall within a scheduled term)`
            : `${paradeNightsCount} ${paradeNightDay}${paradeNightsCount === 1 ? "" : "s"} within term time`,
        });

        const emailResult = await sendEmail({
          to: fromAddress,   // To: is the no-reply address; all real recipients are in BCC.
          bcc: bccList,
          from: fromAddress,
          subject,
          text: body,
          html,
        });

        const recipientList = recipients.map((m) => `${m.rank} ${m.surname}`).join(", ");
        await writeAuditLog(
          "LEAVE_NOTIFICATION_EMAIL",
          `${rank} ${surname}`,
          `Notification dispatched to ${recipients.length} member(s) via BCC${emailResult.simulated ? " [Simulated Mode]" : emailResult.success ? " [Live SMTP]" : " [FAILED: " + emailResult.error + "]"} — Recipients: ${recipientList}`
        );
      }
    } catch (emailErr) {
      console.error("[LEAVE EMAIL] Non-fatal dispatch error:", emailErr);
    }
    // ────────────────────────────────────────────────────────────────────

    return { success: true, data: newRequest };
  } catch (error) {
    console.error("Failed to create leave request:", error);
    return { success: false, error: "Failed to log leave notification" };
  }
}

export async function updateLeaveRequestStatus(id: number, status: string) {
  await bootCheck();
  const rateCheck = checkRateLimit("updateLeaveRequestStatus", 30, 60000);
  if (!rateCheck.success) {
    return {
      success: false,
      error: "Too many status update attempts. Please try again shortly.",
    };
  }

  const parseResult = UpdateLeaveStatusSchema.safeParse({ id, status });
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid status update data",
    };
  }

  const { id: validId, status: validStatus } = parseResult.data;

  try {
    const oldRequest = await db.leaveRequest.findUnique({
      where: { id: validId },
    });
    const oldValue = oldRequest?.status || "UNKNOWN";

    const updatedRequest = await db.leaveRequest.update({
      where: { id: validId },
      data: { status: validStatus },
    });

    revalidatePath("/requests");
    revalidatePath("/adjutant");
    revalidatePath("/");

    const actor = await getActorName();
    await writeAuditLog("LEAVE_STATUS_UPDATE", actor, `Updated leave request #${validId} detail: status, oldvalue=${oldValue}, newvalue=${validStatus}`);

    return { success: true, data: updatedRequest };
  } catch (error) {
    console.error("Failed to update leave status:", error);
    return { success: false, error: "Failed to update leave request status" };
  }
}

export async function deleteLeaveRequest(id: number) {
  await bootCheck();
  const rateCheck = checkRateLimit("deleteLeaveRequest", 30, 60000);
  if (!rateCheck.success) {
    return {
      success: false,
      error: "Too many delete attempts. Please try again shortly.",
    };
  }

  try {
    const existing = await db.leaveRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, error: "Leave entry not found." };
    }

    await db.leaveRequest.delete({
      where: { id },
    });

    revalidatePath("/requests");
    revalidatePath("/adjutant");
    revalidatePath("/admin");
    revalidatePath("/");

    const actor = await getActorName();
    const startStr = formatNZDisplayDate(existing.startDate);
    const endStr = formatNZDisplayDate(existing.endDate);
    await writeAuditLog(
      "LEAVE_DELETE",
      actor,
      `Deleted leave notification #${id} for ${existing.rank} ${existing.surname} (${startStr} to ${endStr})`
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to delete leave request:", error);
    return { success: false, error: "Failed to delete leave entry." };
  }
}

/* =========================================================================
   IP WHITELIST / BLACKLIST SERVER ACTIONS (WITH 30-DAY AUTO REMOVAL)
   ========================================================================= */

export async function getSecurityIps() {
  await bootCheck();
  await cleanupExpiredIpRules();
  try {
    const ips = await db.securityIp.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: ips };
  } catch (error) {
    console.error("Failed to fetch security IPs:", error);
    return { success: false, error: "Failed to fetch IP security rules" };
  }
}

export async function createSecurityIp(rawData: {
  ip: string;
  type: "WHITELIST" | "BLACKLIST";
  reason?: string;
  expiresDays?: number;
}) {
  await bootCheck();
  const rateCheck = checkRateLimit("createSecurityIp", 20, 60000);
  if (!rateCheck.success) {
    return { success: false, error: "Rate limit exceeded. Please wait a minute." };
  }

  const parseResult = CreateSecurityIpSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid IP rule inputs",
    };
  }

  const { ip, type, reason, expiresDays } = parseResult.data;

  // Auto-remove blacklisted IP after 30 days default
  let expiresAt: Date | null = null;
  if (type === "BLACKLIST") {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresDays || 30));
  }

  try {
    const rule = await db.securityIp.upsert({
      where: { ip },
      update: {
        type,
        source: "MANUAL",
        reason: reason || "Manual rule configured by admin",
        expiresAt,
      },
      create: {
        ip,
        type,
        source: "MANUAL",
        reason: reason || "Manual rule configured by admin",
        expiresAt,
      },
    });

    revalidatePath("/admin");

    const actor = await getActorName();
    await writeAuditLog("IP_RULE_CREATE", actor, `Created ${type} security rule for IP ${ip} (Reason: ${reason || "N/A"})`);

    return { success: true, data: rule };
  } catch (error) {
    console.error("Failed to create security IP rule:", error);
    return { success: false, error: "Failed to save IP security rule" };
  }
}

export async function deleteSecurityIp(id: number) {
  await bootCheck();
  try {
    const rule = await db.securityIp.findUnique({ where: { id } });
    const ruleDesc = rule ? `${rule.type} rule for ${rule.ip}` : `#${id}`;

    await db.securityIp.delete({
      where: { id },
    });
    revalidatePath("/admin");

    const actor = await getActorName();
    await writeAuditLog("IP_RULE_DELETE", actor, `Deleted IP security rule: ${ruleDesc}`);

    return { success: true };
  } catch (error) {
    console.error(`Failed to delete IP rule ${id}:`, error);
    return { success: false, error: "Failed to delete IP security rule" };
  }
}

/** Stub for Turbopack HMR cache compatibility */
export async function getSecurityRules() {
  return { success: true, data: [] };
}

export async function getDashboardStats() {
  await bootCheck();
  try {
    const [membersCount, leaveRequests] = await Promise.all([
      db.member.count(),
      db.leaveRequest.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const pendingCount = leaveRequests.filter((r) => r.status === "PENDING").length;
    const approvedCount = leaveRequests.filter((r) => r.status === "APPROVED").length;

    return {
      success: true,
      data: {
        membersCount,
        totalRequestsCount: leaveRequests.length,
        pendingCount,
        approvedCount,
        recentRequests: leaveRequests.slice(0, 5),
      },
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return {
      success: false,
      error: "Failed to fetch dashboard stats",
      data: {
        membersCount: 0,
        totalRequestsCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        recentRequests: [],
      },
    };
  }
}

export async function getAuditLogs(page: number = 1) {
  await bootCheck();
  try {
    const take = 50;
    const skip = (page - 1) * take;
    const [logs, totalCount] = await Promise.all([
      db.auditLog.findMany({
        where: {
          NOT: {
            action: "SYSTEM_BOOT",
          },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      db.auditLog.count({
        where: {
          NOT: {
            action: "SYSTEM_BOOT",
          },
        },
      }),
    ]);
    return {
      success: true,
      data: logs,
      totalPages: Math.ceil(totalCount / take) || 1,
      currentPage: page,
      totalCount,
    };
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return {
      success: false,
      error: "Failed to fetch audit logs",
      data: [],
      totalPages: 1,
      currentPage: 1,
      totalCount: 0,
    };
  }
}

export async function toggleMemberStatus(memberId: number, field: "isActive" | "emailEnabled", value: boolean) {
  await bootCheck();
  const rateCheck = checkRateLimit("toggleMemberStatus", 30, 60000);
  if (!rateCheck.success) {
    return { success: false, error: "Rate limit exceeded. Please wait a moment." };
  }

  // Deactivation resistance: check if we are disabling the last active admin
  if (field === "isActive" && value === false) {
    const target = await db.member.findUnique({ where: { id: memberId } });
    if (target?.isAdmin) {
      const activeAdminsCount = await db.member.count({
        where: { isAdmin: true, isActive: true },
      });
      if (activeAdminsCount <= 1) {
        return {
          success: false,
          error: "Deactivation Denied: Cannot deactivate the last remaining active Administrator account.",
        };
      }
    }
  }

  try {
    const oldMember = await db.member.findUnique({
      where: { id: memberId },
    });
    const oldValue = oldMember ? (oldMember[field] ? "ON" : "OFF") : "UNKNOWN";
    const newValue = value ? "ON" : "OFF";

    const updated = await db.member.update({
      where: { id: memberId },
      data: { [field]: value },
    });

    revalidatePath("/admin");

    const actor = await getActorName();
    await writeAuditLog("MEMBER_TOGGLE_UPDATE", actor, `Updated ${updated.rank} ${updated.surname} detail: ${field}, oldvalue=${oldValue}, newvalue=${newValue}`);

    return { success: true, data: updated };
  } catch (error) {
    console.error("Failed to toggle member status:", error);
    return { success: false, error: "Failed to update member status" };
  }
}

export async function getSystemSetting(key: string): Promise<string> {
  await bootCheck();
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value || "";
  } catch (error) {
    console.error(`Failed to fetch system setting ${key}:`, error);
    return "";
  }
}

export async function updateSystemSetting(key: string, value: string) {
  await bootCheck();
  try {
    const oldSetting = await db.systemSetting.findUnique({
      where: { key },
    });
    const oldValue = oldSetting?.value || "(empty)";

    const updated = await db.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    revalidatePath("/", "layout");
    revalidatePath("/admin");
    revalidatePath("/adjutant");
    revalidatePath("/requests");

    const actor = await getActorName();
    await writeAuditLog("UPDATE_SETTING", actor, `Updated system setting detail: ${key}, oldvalue=${oldValue}, newvalue=${value}`);

    return { success: true, data: updated };
  } catch (error) {
    console.error(`Failed to update system setting ${key}:`, error);
    return { success: false, error: "Failed to update system setting" };
  }
}

export async function uploadBackgroundImage(formData: FormData) {
  await bootCheck();
  const file = formData.get("imageFile") as File | null;
  if (!file) {
    return { success: false, error: "No image file provided." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: "Image file size exceeds the 10MB limit." };
  }

  if (!file.type.startsWith("image/")) {
    return { success: false, error: "Selected file must be a valid image." };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const rawExt = file.name.split(".").pop() || "png";
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const filename = `custom-background.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}?t=${Date.now()}`;
    await updateSystemSetting("background_image_url", publicUrl);

    const actor = await getActorName();
    await writeAuditLog("BACKGROUND_IMAGE_UPLOAD", actor, `Uploaded custom app background image (${(file.size / 1024).toFixed(1)} KB)`);

    return { success: true, dataUrl: publicUrl };
  } catch (error) {
    console.error("Failed to upload background image:", error);
    return { success: false, error: "Failed to upload background image." };
  }
}

export async function removeBackgroundImage() {
  await bootCheck();
  try {
    await updateSystemSetting("background_image_url", "");
    const actor = await getActorName();
    await writeAuditLog("BACKGROUND_IMAGE_REMOVE", actor, "Removed custom app background image");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove background image:", error);
    return { success: false, error: "Failed to remove background image." };
  }
}

export async function getTermYears() {
  await bootCheck();
  try {
    const termYears = await db.termYear.findMany({
      orderBy: { year: "asc" },
    });
    return { success: true, data: termYears };
  } catch (error) {
    console.error("Failed to fetch term years:", error);
    return { success: false, error: "Failed to fetch term years", data: [] };
  }
}

export async function createTermYear(payload: {
  year: number;
  t1Start: string;
  t1End: string;
  t2Start: string;
  t2End: string;
  t3Start: string;
  t3End: string;
  t4Start: string;
  t4End: string;
}) {
  await bootCheck();
  try {
    if (!payload.year || isNaN(payload.year)) {
      return { success: false, error: "Valid year is required." };
    }
    const dates = [
      payload.t1Start, payload.t1End,
      payload.t2Start, payload.t2End,
      payload.t3Start, payload.t3End,
      payload.t4Start, payload.t4End,
    ];
    if (dates.some((d) => !d || !/^\d{4}-\d{2}-\d{2}$/.test(d))) {
      return { success: false, error: "All 8 term start and end dates are required." };
    }

    const existing = await db.termYear.findUnique({
      where: { year: payload.year },
    });
    if (existing) {
      return { success: false, error: `Term dates for year ${payload.year} already exist.` };
    }

    const created = await db.termYear.create({
      data: {
        year: payload.year,
        t1Start: payload.t1Start,
        t1End: payload.t1End,
        t2Start: payload.t2Start,
        t2End: payload.t2End,
        t3Start: payload.t3Start,
        t3End: payload.t3End,
        t4Start: payload.t4Start,
        t4End: payload.t4End,
      },
    });

    revalidatePath("/admin");
    const actor = await getActorName();
    await writeAuditLog("TERM_YEAR_CREATE", actor, `Created term dates for year ${payload.year}`);

    return { success: true, data: created };
  } catch (error: any) {
    console.error("Failed to create term year:", error);
    return { success: false, error: error?.message || "Failed to create term year." };
  }
}

export async function updateTermYear(id: number, payload: {
  year: number;
  t1Start: string;
  t1End: string;
  t2Start: string;
  t2End: string;
  t3Start: string;
  t3End: string;
  t4Start: string;
  t4End: string;
}) {
  await bootCheck();
  try {
    const updated = await db.termYear.update({
      where: { id },
      data: payload,
    });

    revalidatePath("/admin");
    const actor = await getActorName();
    await writeAuditLog("TERM_YEAR_UPDATE", actor, `Updated term dates for year ${payload.year}`);

    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Failed to update term year:", error);
    return { success: false, error: error?.message || "Failed to update term year." };
  }
}

export async function deleteTermYear(id: number) {
  await bootCheck();
  try {
    const target = await db.termYear.findUnique({ where: { id } });
    if (!target) return { success: false, error: "Term year not found." };

    await db.termYear.delete({ where: { id } });

    revalidatePath("/admin");
    const actor = await getActorName();
    await writeAuditLog("TERM_YEAR_DELETE", actor, `Deleted term dates for year ${target.year}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete term year:", error);
    return { success: false, error: "Failed to delete term year." };
  }
}

export async function fetchNZMagicTermDates(year: number) {
  await bootCheck();
  try {
    const paradeNightSetting = await getSystemSetting("parade_night");
    const paradeNight = paradeNightSetting || "Wednesday";

    // Official NZ Ministry of Education term date windows for Secondary and Composite Schools
    const nzSecondaryMoEDates: Record<number, { t1: [string, string]; t2: [string, string]; t3: [string, string]; t4: [string, string] }> = {
      2024: {
        t1: ["2024-01-29", "2024-04-12"],
        t2: ["2024-04-29", "2024-07-05"],
        t3: ["2024-07-22", "2024-09-27"],
        t4: ["2024-10-14", "2024-12-10"],
      },
      2025: {
        t1: ["2025-01-27", "2025-04-11"],
        t2: ["2025-04-28", "2025-06-27"],
        t3: ["2025-07-14", "2025-09-19"],
        t4: ["2025-10-06", "2025-12-09"],
      },
      2026: {
        t1: ["2026-01-26", "2026-04-02"],
        t2: ["2026-04-20", "2026-07-03"],
        t3: ["2026-07-20", "2026-09-25"],
        t4: ["2026-10-12", "2026-12-11"],
      },
      2027: {
        t1: ["2027-01-25", "2027-04-09"],
        t2: ["2027-04-26", "2027-07-02"],
        t3: ["2027-07-19", "2027-09-24"],
        t4: ["2027-10-11", "2027-12-10"],
      },
      2028: {
        t1: ["2028-01-31", "2028-04-13"],
        t2: ["2028-05-01", "2028-07-07"],
        t3: ["2028-07-24", "2028-09-29"],
        t4: ["2028-10-16", "2028-12-12"],
      },
    };

    let rawTerms = nzSecondaryMoEDates[year];

    if (!rawTerms) {
      rawTerms = {
        t1: [`${year}-01-26`, `${year}-04-09`],
        t2: [`${year}-04-20`, `${year}-07-03`],
        t3: [`${year}-07-20`, `${year}-09-25`],
        t4: [`${year}-10-12`, `${year}-12-11`],
      };
    }

    const t1Start = findFirstParadeNightDate(rawTerms.t1[0], paradeNight);
    const t1End = findLastParadeNightDate(rawTerms.t1[1], paradeNight);
    const t2Start = findFirstParadeNightDate(rawTerms.t2[0], paradeNight);
    const t2End = findLastParadeNightDate(rawTerms.t2[1], paradeNight);
    const t3Start = findFirstParadeNightDate(rawTerms.t3[0], paradeNight);
    const t3End = findLastParadeNightDate(rawTerms.t3[1], paradeNight);
    const t4Start = findFirstParadeNightDate(rawTerms.t4[0], paradeNight);
    const t4End = findLastParadeNightDate(rawTerms.t4[1], paradeNight);

    const actor = await getActorName();
    await writeAuditLog("MAGIC_TERM_DATES_FETCHED", actor, `Auto-retrieved NZ MoE Secondary School term dates for ${year} aligned to ${paradeNight}s`);

    return {
      success: true,
      year,
      paradeNight,
      dates: {
        t1Start,
        t1End,
        t2Start,
        t2End,
        t3Start,
        t3End,
        t4Start,
        t4End,
      },
    };
  } catch (error) {
    console.error("Failed to fetch magic term dates:", error);
    return { success: false, error: "Failed to auto-retrieve term dates." };
  }
}

export async function sendTestEmail(memberId: number) {
  await bootCheck();
  const rateCheck = checkRateLimit("sendTestEmail", 20, 60000);
  if (!rateCheck.success) {
    return { success: false, error: "Rate limit exceeded. Please wait a moment before sending more test emails." };
  }

  try {
    const member = await db.member.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return { success: false, error: "Member not found" };
    }

    const fromAddress = "donotreply@29squadron.org.nz";
    const subject = "Test email from the Leave Portal";
    const nowNz = formatNZTime(new Date());

    const unitName = (await getSystemSetting("unit_name")) || "29 Squadron";

    const bodyContent = `
============================================================
TEST EMAIL NOTIFICATION - LEAVE PORTAL
============================================================

Hello ${member.rank} ${member.surname},

This is a test notification from the ${unitName} Leave Portal.

Member Profile Details:
- Rank & Surname: ${member.rank} ${member.surname}
- Registered Email: ${member.email}
- Account Status: ${member.isActive ? "Active" : "Inactive"}
- Email Notifications: ${member.emailEnabled ? "Enabled" : "Disabled"}

If you are receiving this email, your notification delivery path is fully operational and ready to receive unit leave status updates.

Regards,
Leave Portal Postmaster
${unitName} ATC

(do not reply - this account is not monitored)
============================================================
`.trim();

    const emailResult = await sendEmail({
      to: member.email,
      from: fromAddress,
      subject,
      text: bodyContent,
    });

    const actor = await getActorName();
    await writeAuditLog(
      "TEST_EMAIL_SENT",
      actor,
      `Sent test email to ${member.rank} ${member.surname} (${member.email}) from ${fromAddress}${emailResult.simulated ? " [Simulated Mode]" : " [Live SMTP]"}`
    );

    revalidatePath("/admin");

    if (!emailResult.success) {
      return {
        success: false,
        error: `Failed to send email: ${emailResult.error}`,
      };
    }

    if (emailResult.simulated) {
      return {
        success: true,
        message: `Simulated Email Sent! (Add SMTP_HOST/SMTP_USER to .env to send live emails over port 587)`,
      };
    }

    return {
      success: true,
      message: `Live email dispatched to ${member.email} via SMTP (MessageID: ${emailResult.messageId})`,
    };
  } catch (error) {
    console.error("Failed to send test email:", error);
    return { success: false, error: "Failed to dispatch test email" };
  }
}

/* =========================================================================
   LEAVE NOTIFICATION EMAIL TEMPLATE ACTIONS
   ========================================================================= */

export async function getLeaveNotificationTemplate(): Promise<{ subject: string; body: string }> {
  await bootCheck();
  try {
    const raw = await getSystemSetting("leave_notification_template");
    if (raw) {
      const parsed = parseTemplateJson(raw);
      if (parsed) return parsed;
    }
  } catch (error) {
    console.error("Failed to load leave notification template:", error);
  }
  return DEFAULT_LEAVE_NOTIFICATION_TEMPLATE;
}

export async function updateLeaveNotificationTemplate(subject: string, body: string) {
  await bootCheck();
  const rateCheck = checkRateLimit("updateLeaveNotificationTemplate", 20, 60000);
  if (!rateCheck.success) {
    return { success: false, error: "Too many update attempts. Please wait a moment." };
  }

  const trimSubject = subject?.trim();
  const trimBody = body?.trim();

  if (!trimSubject) return { success: false, error: "Subject cannot be empty." };
  if (!trimBody) return { success: false, error: "Body cannot be empty." };
  if (trimSubject.length > 500) return { success: false, error: "Subject must be 500 characters or less." };
  if (trimBody.length > 10000) return { success: false, error: "Body must be 10,000 characters or less." };

  const templateJson = JSON.stringify({ subject: trimSubject, body: trimBody });

  const actor = await getActorName();
  const res = await updateSystemSetting("leave_notification_template", templateJson);
  if (res.success) {
    await writeAuditLog("UPDATE_LEAVE_EMAIL_TEMPLATE", actor, "Updated leave notification email proforma template");
  }
  return res;
}

/* =========================================================================
   HELP DOCUMENTATION & VERSIONING SYSTEM ACTIONS (MAX 3 VERSIONS)
   ========================================================================= */

const HELP_DATA_PATH = path.join(process.cwd(), "src", "data", "helpArticles.json");

export async function getHelpArticle(key: string) {
  try {
    if (!fs.existsSync(HELP_DATA_PATH)) {
      return null;
    }
    const fileContent = fs.readFileSync(HELP_DATA_PATH, "utf-8");
    const data = JSON.parse(fileContent);
    return data[key] || null;
  } catch (error) {
    console.error("Failed to read help articles:", error);
    return null;
  }
}

export async function saveHelpArticleVersion(
  key: string,
  versionData: {
    title: string;
    subtitle: string;
    badge: "System Guide" | "Page Guide" | "Panel Reference" | "Modal Reference";
    purpose: string;
    sections: any[];
    bestPractices?: string[];
  }
) {
  try {
    const actorName = await getActorName();

    let data: Record<string, any> = {};
    if (fs.existsSync(HELP_DATA_PATH)) {
      const fileContent = fs.readFileSync(HELP_DATA_PATH, "utf-8");
      data = JSON.parse(fileContent);
    }

    const existingArticle = data[key] || { key, versions: [] };
    const currentVersions = existingArticle.versions || [];

    const newVersion = {
      versionId: `v_${Date.now()}`,
      savedAt: new Date().toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" }),
      savedBy: actorName,
      ...versionData,
    };

    // Prepend new version and strictly enforce maximum 3 versions (delete 4th oldest)
    const updatedVersions = [newVersion, ...currentVersions].slice(0, 3);

    data[key] = {
      key,
      versions: updatedVersions,
    };

    const dir = path.dirname(HELP_DATA_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(HELP_DATA_PATH, JSON.stringify(data, null, 2), "utf-8");

    await writeAuditLog(
      "HELP_ARTICLE_UPDATED",
      actorName,
      `Saved new version of help article '${key}' (Retained ${updatedVersions.length}/3 versions)`
    );

    revalidatePath("/");
    revalidatePath("/adjutant");
    revalidatePath("/admin");

    return { success: true, article: data[key] };
  } catch (error) {
    console.error("Failed to save help article:", error);
    return { success: false, error: "Failed to save help article version." };
  }
}

export async function revertHelpArticleToVersion(key: string, targetVersionId: string) {
  try {
    const actorName = await getActorName();

    if (!fs.existsSync(HELP_DATA_PATH)) {
      return { success: false, error: "Help storage file not found." };
    }

    const fileContent = fs.readFileSync(HELP_DATA_PATH, "utf-8");
    const data = JSON.parse(fileContent);

    const article = data[key];
    if (!article || !article.versions || article.versions.length === 0) {
      return { success: false, error: "Help article not found." };
    }

    const targetVer = article.versions.find((v: any) => v.versionId === targetVersionId);
    if (!targetVer) {
      return { success: false, error: "Target version not found." };
    }

    // Promote target version to new top version (keeping max 3 versions)
    const revertedVersion = {
      ...targetVer,
      versionId: `v_${Date.now()}`,
      savedAt: new Date().toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" }) + " (Reverted)",
      savedBy: actorName,
    };

    const updatedVersions = [revertedVersion, ...article.versions].slice(0, 3);

    data[key] = {
      key,
      versions: updatedVersions,
    };

    fs.writeFileSync(HELP_DATA_PATH, JSON.stringify(data, null, 2), "utf-8");

    await writeAuditLog(
      "HELP_ARTICLE_REVERTED",
      actorName,
      `Reverted help article '${key}' to version ${targetVersionId} (Retained ${updatedVersions.length}/3 versions)`
    );

    revalidatePath("/");
    revalidatePath("/adjutant");
    revalidatePath("/admin");

    return { success: true, article: data[key] };
  } catch (error) {
    console.error("Failed to revert help article:", error);
    return { success: false, error: "Failed to revert help article version." };
  }
}

/**
 * Submits user feedback or web inquiry message
 */
export async function submitFeedback(data: {
  rank: string;
  name: string;
  email: string;
  message: string;
  website_hp?: string;
}) {
  try {
    // Honeypot Bot Trap Check
    if (data.website_hp && data.website_hp.trim() !== "") {
      return { success: true, message: "Thank you for your feedback!" };
    }

    const rateCheck = checkRateLimit("submitFeedback", 5, 60000);
    if (!rateCheck.success) {
      return {
        success: false,
        error: "Feedback rate limit exceeded. Please wait a minute before submitting again.",
      };
    }

    const rank = sanitizeText(data.rank || "CDT");
    const name = sanitizeText(data.name || "");
    const email = sanitizeText(data.email || "");
    const message = sanitizeText(data.message || "");

    if (!name || !email || !message) {
      return { success: false, error: "Please fill out all required fields." };
    }

    const unitName = (await getSystemSetting("unit_name")) || "29 Squadron";
    const actorName = `${rank} ${name}`;

    // Write audit log entry
    await writeAuditLog(
      "USER_FEEDBACK_SUBMITTED",
      actorName,
      `Feedback from ${actorName} (${email}): "${message.substring(0, 120)}${message.length > 120 ? "..." : ""}"`
    );

    // Dispatch notification email
    await sendEmail({
      to: "admin@cadetforces.org.nz",
      subject: `[${unitName} Leave Portal] Feedback Message from ${actorName}`,
      text: `
============================================================
WEBSITE FEEDBACK & INQUIRY MESSAGE
============================================================

Unit: ${unitName}
Sender Rank & Name: ${actorName}
Sender Email: ${email}
Timestamp: ${formatNZTime(new Date())}

Message Content:
------------------------------------------------------------
${message}
------------------------------------------------------------
`.trim(),
    });

    return {
      success: true,
      message: "Thank you for your feedback! Your message has been sent to the web team.",
    };
  } catch (error: any) {
    console.error("Failed to submit feedback:", error);
    return {
      success: false,
      error: error.message || "Failed to submit feedback. Please try again.",
    };
  }
}
