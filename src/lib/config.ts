/**
 * Global Application Environment Status Configuration
 * Options: "DEVELOPING" | "TESTING" | "LIVE"
 *
 * Rules:
 * - If STATUS is not DEVELOPING, database resets, wipes, and seed rewrites are strictly prohibited.
 * - Only in DEVELOPING mode may test data or schema changes be applied, while preserving existing user data.
 */
export type AppStatus = "DEVELOPING" | "TESTING" | "LIVE";

export const APP_STATUS: AppStatus = "DEVELOPING";

export function isDbResetAllowed(): boolean {
  return APP_STATUS === "DEVELOPING";
}
