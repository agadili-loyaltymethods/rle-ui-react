/**
 * Shared formatting utilities.
 */

/** Format a number with thousands separators (e.g. 10000 → "10,000"). */
export function formatNumber(
  n: number | undefined | null,
  fallback = 0,
): string {
  return (n ?? fallback).toLocaleString("en-US");
}

/**
 * Generate a MongoDB-style ObjectId (24-char hex string).
 * Uses a 4-byte timestamp prefix + 8 random bytes.
 */
/**
 * Convert a camelCase field name to a human-readable Title Case label.
 * E.g. "srcChannelType" → "Src Channel Type", "memberID" → "Member ID".
 */
export function toFieldLabel(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2") // lowercase→Uppercase boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // UPPERCASE→Upperlower boundary
    .replace(/^./, (c) => c.toUpperCase()) // capitalize first letter
    .replace(/ ./g, (c) => c.toUpperCase()); // capitalize each word
}

/**
 * Generate a MongoDB-style ObjectId (24-char hex string).
 * Uses a 4-byte timestamp prefix + 8 random bytes.
 */
export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return timestamp + random;
}
