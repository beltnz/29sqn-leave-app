/**
 * Date Utilities for 29 Squadron Leave App
 * Enforces UTC internal storage/retrieval and NZ local time (Pacific/Auckland) display/preset calculations.
 */

export const NZ_TIMEZONE = "Pacific/Auckland";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Safely parses any YYYY-MM-DD string or Date object into a pure Local Calendar Date (00:00:00 local time).
 * Prevents UTC timezone shift bugs when calling getDay(), getDate(), setHours(), etc.
 */
export function parseLocalDate(dateInput: Date | string | number): Date {
  if (!dateInput) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0);
  }
  const str = String(dateInput).split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Returns today's date in New Zealand local time as a "YYYY-MM-DD" string.
 */
export function getNZTodayString(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: NZ_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Gets the numeric day-of-week index (0=Sunday ... 6=Saturday) for a given parade night day name.
 * Defaults to 3 (Wednesday).
 */
export function getParadeNightDayIndex(paradeNightName: string = "Wednesday"): number {
  const idx = DAYS_OF_WEEK.findIndex(
    (d) => d.toLowerCase() === (paradeNightName || "Wednesday").trim().toLowerCase()
  );
  return idx !== -1 ? idx : 3;
}

/**
 * Robustly checks if a date string or Date object corresponds to the configured parade night day.
 * Immune to browser local vs UTC timezone shifts.
 */
export function isParadeNightDate(dateInput: Date | string | number, paradeNightName: string = "Wednesday"): boolean {
  const targetDayIdx = getParadeNightDayIndex(paradeNightName);

  if (typeof dateInput === "string") {
    const str = dateInput.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      const utcDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).getUTCDay();
      return utcDay === targetDayIdx;
    }
  }

  const d = parseLocalDate(dateInput);
  return d.getDay() === targetDayIdx;
}

/**
 * Returns the day of the week (0=Sunday ... 6=Saturday) for a given YYYY-MM-DD or current time in NZ local time.
 */
export function getNZDayOfWeek(dateStr?: string): number {
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).getUTCDay();
  }
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: NZ_TIMEZONE,
    weekday: "long",
  }).format(new Date());
  return DAYS_OF_WEEK.indexOf(weekdayStr);
}

/**
 * Adds N days to a "YYYY-MM-DD" date string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d + days, 0, 0, 0));
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates "This Parade Night" date (YYYY-MM-DD) based on paradeNight day name (e.g. "Wednesday") in NZ time.
 */
export function getThisParadeNightString(paradeNight: string): string {
  const todayStr = getNZTodayString();
  const targetDayNum = DAYS_OF_WEEK.indexOf(paradeNight);
  if (targetDayNum === -1) return todayStr;
  const currentDayNum = getNZDayOfWeek(todayStr);
  const diff = (targetDayNum - currentDayNum + 7) % 7;
  return addDaysToDateString(todayStr, diff);
}

/**
 * Calculates "Next Parade Night" date (YYYY-MM-DD) based on paradeNight day name in NZ time.
 */
export function getNextParadeNightString(paradeNight: string): string {
  const thisParadeStr = getThisParadeNightString(paradeNight);
  return addDaysToDateString(thisParadeStr, 7);
}

/**
 * Formats a Date/timestamp into New Zealand local time (YYYY-MM-DD HH:mm:ss).
 * Takes daylight savings into account.
 */
export function formatNZTime(dateInput: Date | string | number): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Invalid Date";
    const formatter = new Intl.DateTimeFormat("en-NZ", {
      timeZone: NZ_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
  } catch (error) {
    return new Date(dateInput).toISOString();
  }
}

/**
 * Formats a YYYY-MM-DD or UTC Date for user display in NZ local time (e.g. "12 Aug 2026").
 */
export function formatNZDisplayDate(dateInput: Date | string): string {
  if (!dateInput) return "";
  let date: Date;
  if (typeof dateInput === "string") {
    const str = dateInput.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    } else {
      date = new Date(dateInput);
    }
  } else if (dateInput instanceof Date) {
    date = new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0));
  } else {
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Formats a YYYY-MM-DD date string into concise DD MMM format (e.g., "05 JAN", "28 MAR").
 */
export function formatTermShortDate(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  if (isNaN(date.getTime())) return dateStr;
  const dayStr = String(d).padStart(2, "0");
  const monthStr = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  return `${dayStr} ${monthStr}`;
}

/**
 * Finds the first date on or after startStr that lands on the configured parade night day.
 */
export function findFirstParadeNightDate(startStr: string, paradeNightDay: string = "Wednesday"): string {
  if (!startStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr)) return startStr;
  const targetDayIdx = getParadeNightDayIndex(paradeNightDay);
  let [y, m, d] = startStr.split("-").map(Number);
  let date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  while (date.getUTCDay() !== targetDayIdx) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Finds the last date on or before endStr that lands on the configured parade night day.
 */
export function findLastParadeNightDate(endStr: string, paradeNightDay: string = "Wednesday"): string {
  if (!endStr || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) return endStr;
  const targetDayIdx = getParadeNightDayIndex(paradeNightDay);
  let [y, m, d] = endStr.split("-").map(Number);
  let date = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  while (date.getUTCDay() !== targetDayIdx) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
