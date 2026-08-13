import { z } from "zod";

export const DEFAULT_RANKS = [
  "RCRT",
  "CDTUT",
  "CDT",
  "LACDT",
  "CDTCPL",
  "CDTSGT",
  "CDTFSGT",
  "CDTWO",
  "OFFCDT",
  "PLTOFF",
  "FGOFF",
  "FLTLT",
  "SQNLDR",
  "MR",
  "MS",
  "MRS",
  "MISS",
  "MASTER",
  "OTHER",
];

export const DEFAULT_RANKS_STRING = DEFAULT_RANKS.join(", ");

export const RANKS = DEFAULT_RANKS;

export function parseRanksList(ranksSetting?: string | null): string[] {
  if (!ranksSetting || !ranksSetting.trim()) {
    return DEFAULT_RANKS;
  }
  const parsed = ranksSetting
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_RANKS;
}

export const RankEnum = z.string();

/**
 * Helper to sanitize user string inputs by removing HTML tags and harmful scripts
 */
export function sanitizeText(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>?/gm, "") // Remove HTML tags
    .replace(/[<>'"]/g, "") // Remove potentially dangerous quote/bracket characters
    .trim();
}

import { getNZTodayString } from "@/lib/dateUtils";

function parseDateInputToUTC(val: string | Date): Date {
  if (val instanceof Date) return val;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }
  return new Date(val);
}

/**
 * Leave Request Submission Schema (Personnel supply Rank, Surname, Date Range, Reason)
 */
export const CreateLeaveRequestSchema = z
  .object({
    rank: RankEnum.optional().default("CDT"),
    surname: z
      .string()
      .min(1, "Surname is required")
      .max(50, "Surname must be 50 characters or less")
      .regex(/^[a-zA-Z\s'\-]+$/, "Surname contains invalid characters")
      .transform(sanitizeText),
    startDate: z.string().or(z.date()).transform(parseDateInputToUTC),
    endDate: z
      .string()
      .or(z.date())
      .optional()
      .or(z.literal(""))
      .transform((val) => (val ? parseDateInputToUTC(val) : undefined)),
    reason: z
      .string()
      .min(1, "Reason is required")
      .max(500, "Reason must be 500 characters or less")
      .transform(sanitizeText),
  })
  .transform((data) => {
    // If no end date is supplied, assume start = end
    if (!data.endDate) {
      data.endDate = new Date(data.startDate);
    }
    return data as { rank: string; surname: string; startDate: Date; endDate: Date; reason: string };
  })
  .superRefine((data, ctx) => {
    if (isNaN(data.startDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date is not a valid date",
        path: ["startDate"],
      });
      return;
    }
    if (isNaN(data.endDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date is not a valid date",
        path: ["endDate"],
      });
      return;
    }

    // Get current date in New Zealand as UTC midnight for clean comparison
    const nzTodayStr = getNZTodayString();
    const [ny, nm, nd] = nzTodayStr.split("-").map(Number);
    const nzTodayUtc = new Date(Date.UTC(ny, nm - 1, nd, 0, 0, 0));

    const checkStart = new Date(data.startDate);
    const checkEnd = new Date(data.endDate);

    if (checkStart < nzTodayUtc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date cannot be in the past",
        path: ["startDate"],
      });
    }
    if (checkEnd < nzTodayUtc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date cannot be in the past",
        path: ["endDate"],
      });
    }

    // Ensure end date is on or after start date
    if (checkEnd < checkStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date",
        path: ["endDate"],
      });
    }

    // Ensure start and end dates are no more than 2 years apart
    const twoYearsMs = 2 * 365.25 * 24 * 60 * 60 * 1000;
    if (data.endDate.getTime() - data.startDate.getTime() > twoYearsMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start and end dates cannot be more than 2 years apart",
        path: ["endDate"],
      });
    }

    // Ensure the start date is no more than 1 year into the future
    const oneYearMs = 365.25 * 24 * 60 * 60 * 1000;
    if (data.startDate.getTime() - nzTodayUtc.getTime() > oneYearMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Start date cannot be more than 1 year in the future",
        path: ["startDate"],
      });
    }
  });

/**
 * Leave Request Status Update Schema
 */
export const UpdateLeaveStatusSchema = z.object({
  id: z.number().int().positive("Invalid leave request ID"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

/**
 * Member / Adjutant Creation Schema
 */
export const CreateMemberSchema = z.object({
  rank: RankEnum.optional().default("FLTLT"),
  surname: z
    .string()
    .min(1, "Surname is required")
    .max(50, "Surname must be 50 characters or less")
    .regex(/^[a-zA-Z\s'\-]+$/, "Surname contains invalid characters")
    .transform(sanitizeText),
  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email must be 100 characters or less")
    .toLowerCase()
    .trim(),
  password: z.string().min(4, "Password must be at least 4 characters").optional().default("29sqn1941"),
  isStaff: z.boolean().optional().default(false),
  isAdjutant: z.boolean().optional().default(false),
  isManager: z.boolean().optional().default(false),
  isAdmin: z.boolean().optional().default(false),
});

/**
 * Security IP Rule Schema
 */
export const CreateSecurityIpSchema = z.object({
  ip: z
    .string()
    .min(3, "IP address is required")
    .max(45, "Invalid IP address length")
    .regex(/^([0-9a-fA-F.:]+)$/, "Invalid IP address format")
    .trim(),
  type: z.enum(["WHITELIST", "BLACKLIST"]),
  reason: z.string().max(200).optional().transform((val) => (val ? sanitizeText(val) : "Manual IP Rule")),
  expiresDays: z.number().int().min(1).max(365).optional().default(30),
});

/**
 * Member Password Update Schema (Admin setting password for any adjutant)
 */
export const UpdateMemberPasswordSchema = z.object({
  memberId: z.number().int().positive("Invalid member ID"),
  newPassword: z.string().min(4, "Password must be at least 4 characters long"),
});

/**
 * Member Full Profile Edit Schema
 */
export const UpdateMemberSchema = z.object({
  id: z.number().int().positive("Invalid member ID"),
  rank: RankEnum.optional().default("FLTLT"),
  surname: z
    .string()
    .min(1, "Surname is required")
    .max(50, "Surname must be 50 characters or less")
    .regex(/^[a-zA-Z\s'\-]+$/, "Surname contains invalid characters")
    .transform(sanitizeText),
  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email must be 100 characters or less")
    .toLowerCase()
    .trim(),
  password: z.string().min(4, "Password must be at least 4 characters").optional().or(z.literal("")),
  isStaff: z.boolean().optional().default(false),
  isAdjutant: z.boolean().optional().default(false),
  isManager: z.boolean().optional().default(false),
  isAdmin: z.boolean().optional().default(false),
});

/**
 * Admin Login Credentials Schema
 */
export const AdminLoginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .transform(sanitizeText),
  password: z.string().min(1, "Password is required"),
  clientIp: z.string().optional().default("127.0.0.1"),
});
