/**
 * Generic nested-object utilities for extension fields.
 *
 * Handles any field whose schema type is 'object' (e.g. featured, affl, umh)
 * by flattening to/from dot-path keys (e.g. 'featured.AT') so the form can
 * treat every leaf as a regular scalar field.
 */

/**
 * Flatten one level of nested objects into dot-path keys.
 * `{ featured: { AT: true, BR: false } }` → `{ 'featured.AT': true, 'featured.BR': false }`
 * Scalars pass through unchanged. Arrays are left as-is (not flattened).
 */
export function flattenNested(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      for (const [sub, subVal] of Object.entries(
        val as Record<string, unknown>,
      )) {
        out[`${key}.${sub}`] = subVal;
      }
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Reverse of flattenNested: reassemble dot-path keys into nested objects.
 * `{ 'featured.AT': true, brandCode: 'X' }` → `{ featured: { AT: true }, brandCode: 'X' }`
 */
export function unflattenDotPaths(
  flat: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(flat)) {
    const dot = key.indexOf(".");
    if (dot !== -1) {
      const parent = key.slice(0, dot);
      const child = key.slice(dot + 1);
      if (
        !out[parent] ||
        typeof out[parent] !== "object" ||
        Array.isArray(out[parent])
      ) {
        out[parent] = {};
      }
      (out[parent] as Record<string, unknown>)[child] = val;
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Summarize a nested value for display in a table cell.
 * - Boolean objects → join truthy keys: `{ AT: true, BR: false, GP: true }` → "AT, GP"
 * - Arrays of primitives → join values: `['a', 'b']` → "a, b"
 * - Other objects → "N items"
 * - Nullish → ""
 */
export function summarizeNested(val: unknown): string {
  if (val == null) return "";
  if (Array.isArray(val)) {
    return val.map(String).join(", ");
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>);
    // Boolean map — show truthy keys
    if (
      entries.length > 0 &&
      entries.every(([, v]) => typeof v === "boolean")
    ) {
      return entries
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ");
    }
    return `${entries.length} items`;
  }
  return String(val);
}
