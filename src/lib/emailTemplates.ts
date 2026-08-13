/**
 * Email Templates — 29 Squadron Leave Portal
 *
 * The leave-notification proforma is stored as a JSON object in SystemSetting
 * (key: "leave_notification_template") so it can be changed by admins at runtime.
 *
 * Supported placeholders in both subject and body:
 *   {{rank}}         — submitter's rank
 *   {{surname}}      — submitter's surname
 *   {{startDate}}    — leave start date (NZ-formatted)
 *   {{endDate}}      — leave end date (NZ-formatted)
 *   {{reason}}       — reason for leave
 *   {{submittedAt}}  — NZ timestamp of submission
 *   {{unitName}}     — unit name from system settings
 *   {{duration}}     — total number of calendar days of leave (inclusive)
 *   {{paradenights}} — number of configured parade nights that fall within a term during the leave period
 */

export interface LeaveNotificationTemplate {
  subject: string;
  body: string;
}

/** The default proforma shipped with the application. */
export const DEFAULT_LEAVE_NOTIFICATION_TEMPLATE: LeaveNotificationTemplate = {
  subject: `[{{unitName}}] Leave Notification — {{rank}} {{surname}} ({{startDate}} to {{endDate}})`,
  body: `\
============================================================
LEAVE NOTIFICATION — {{unitName}}
============================================================

A new leave notification has been submitted.

Details:
  Member:          {{rank}} {{surname}}
  From:            {{startDate}}
  To:              {{endDate}}
  Duration:        {{duration}} day(s)
  Parade nights:   {{paradenights}}
  Reason:          {{reason}}
  Logged at:       {{submittedAt}}

============================================================
This is an automated notification. Do not reply to this email.`,
};

/** A single term's date range (YYYY-MM-DD strings, stored as UTC-midnight dates in DB). */
export interface TermRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export type TemplateData = {
  rank: string;
  surname: string;
  startDate: string;
  endDate: string;
  reason: string;
  submittedAt: string;
  unitName: string;
  duration: string;
  paradeNights: string;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* Calculation helpers                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Parses a "YYYY-MM-DD" string (stored as UTC midnight in the DB) into a plain
 * UTC midnight Date object, safely avoiding timezone shifts.
 */
function parseDateStr(dateInput: Date | string): Date {
  if (dateInput instanceof Date) {
    return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate(), 0, 0, 0));
  }
  const str = String(dateInput).split("T")[0];
  const [y, m, d] = str.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

/**
 * Returns the number of calendar days from startDate to endDate, inclusive.
 * e.g. 14 Aug → 14 Aug = 1 day; 14 Aug → 15 Aug = 2 days.
 */
export function calculateDuration(startDate: Date | string, endDate: Date | string): number {
  const start = parseDateStr(startDate);
  const end = parseDateStr(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diffMs / 86_400_000) + 1);
}

/**
 * Returns the YYYY-MM-DD string for a UTC Date object.
 */
function toYMD(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns true if dateStr (YYYY-MM-DD) is within any of the supplied term ranges
 * (inclusive on both ends).
 */
function isInTermTime(dateStr: string, terms: TermRange[]): boolean {
  for (const term of terms) {
    if (dateStr >= term.start && dateStr <= term.end) return true;
  }
  return false;
}

/**
 * Calculates how many parade nights (days matching the configured day-of-week)
 * fall within at least one term during the leave period.
 *
 * @param startDate     Leave start date
 * @param endDate       Leave end date
 * @param paradeNight   Day name from admin settings, e.g. "Wednesday"
 * @param termRanges    Array of term start/end date strings from the TermYear table
 */
export function calculateParadeNights(
  startDate: Date | string,
  endDate: Date | string,
  paradeNight: string,
  termRanges: TermRange[]
): number {
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetDow = DAYS.findIndex(
    (d) => d.toLowerCase() === (paradeNight || "Wednesday").trim().toLowerCase()
  );
  if (targetDow === -1) return 0;

  const start = parseDateStr(startDate);
  const end = parseDateStr(endDate);

  let count = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (cursor.getUTCDay() === targetDow) {
      const ymd = toYMD(cursor);
      if (termRanges.length === 0 || isInTermTime(ymd, termRanges)) {
        count++;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Template rendering                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Replaces all {{placeholder}} tokens in a template string with real values.
 */
export function renderTemplate(template: string, data: TemplateData): string {
  return template
    .replace(/\{\{rank\}\}/g, data.rank)
    .replace(/\{\{surname\}\}/g, data.surname)
    .replace(/\{\{startDate\}\}/g, data.startDate)
    .replace(/\{\{endDate\}\}/g, data.endDate)
    .replace(/\{\{reason\}\}/g, data.reason)
    .replace(/\{\{submittedAt\}\}/g, data.submittedAt)
    .replace(/\{\{unitName\}\}/g, data.unitName)
    .replace(/\{\{duration\}\}/g, data.duration)
    .replace(/\{\{paradenights\}\}/g, data.paradeNights);
}

/**
 * Escapes characters that are special in HTML so they render literally inside a <pre>.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders both subject and body of the template with the supplied data.
 * Also produces an `html` version that wraps the body in a monospace <pre>
 * so space-padded columns are preserved in HTML-capable email clients.
 */
export function renderLeaveNotificationEmail(
  template: LeaveNotificationTemplate,
  data: TemplateData
): { subject: string; body: string; html: string } {
  const subject = renderTemplate(template.subject, data);
  const body = renderTemplate(template.body, data);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:16px 0;background:#f4f4f4;font-family:sans-serif;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.12);">
    <div style="background:#1e3a5f;padding:18px 24px;">
      <p style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">
        Leave Notification
      </p>
    </div>
    <div style="padding:24px;">
      <pre style="margin:0;font-family:'Courier New',Courier,monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;color:#1a1a1a;">${escapeHtml(body)}</pre>
    </div>
    <div style="padding:12px 24px;background:#f8f8f8;border-top:1px solid #e0e0e0;">
      <p style="margin:0;font-size:11px;color:#888888;">This is an automated notification from the Leave Portal. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, body, html };
}

/**
 * Parses a raw JSON string (from SystemSetting) into a LeaveNotificationTemplate.
 * Returns null if the string is invalid or missing required fields.
 */
export function parseTemplateJson(raw: string): LeaveNotificationTemplate | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.subject === "string" &&
      parsed.subject.trim() !== "" &&
      typeof parsed.body === "string" &&
      parsed.body.trim() !== ""
    ) {
      return { subject: parsed.subject, body: parsed.body };
    }
  } catch {
    // Invalid JSON — fall through
  }
  return null;
}
