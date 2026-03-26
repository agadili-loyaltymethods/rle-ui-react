/**
 * Shared date utilities for sentinel date handling.
 *
 * Design pattern: far-future dates (year >= 2999) are treated as "never expires"
 * sentinel values throughout the UI. Display shows "Never" and edit forms offer
 * a checkbox toggle instead of requiring users to enter a placeholder date.
 */

const NEVER_EXPIRES_THRESHOLD = 2999;

/** Canonical sentinel date used when "never expires" is selected. */
export const NEVER_EXPIRES_DATE = "3000-01-01";

/** Returns true if the date string represents a "never expires" sentinel. */
export function isNeverDate(d?: string | null): boolean {
  if (!d) return false;
  const year = parseInt(d.slice(0, 4), 10);
  return year >= NEVER_EXPIRES_THRESHOLD;
}

/**
 * Extract the YYYY-MM-DD date portion from an ISO datetime string.
 * These dates are local/calendar dates with no timezone — never parse them
 * through `new Date(isoString)` which would interpret the timestamp as UTC.
 */
export function toDateOnly(d: string): string {
  return d.slice(0, 10);
}

/**
 * Returns today's date as a YYYY-MM-DD string in the browser's local timezone.
 * Use this instead of `new Date()` when comparing against date-only strings.
 */
export function todayDateOnly(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Formats a date for display, showing "Never" for sentinel dates.
 *  Treats the input as a local calendar date (YYYY-MM-DD) — no timezone conversion. */
export function formatDate(d?: string | null): string {
  if (!d) return "\u2014";
  if (isNeverDate(d)) return "Never";
  // Extract YYYY-MM-DD components and format as a local date for display.
  // Uses the Date constructor with individual components (not an ISO string)
  // so no UTC interpretation occurs.
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y!, m! - 1, day!).toLocaleDateString();
}
