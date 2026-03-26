/**
 * Shared RHF error utilities.
 *
 * Converts React Hook Form's nested FieldErrors into a flat Record<string, string>
 * for use with tab-error-count and first-tab-with-error utilities.
 */

import type { FieldErrors } from "react-hook-form";

/**
 * Flatten RHF's nested FieldErrors into a simple Record<string, string>.
 *
 * Extension field errors (nested under `ext`) are promoted to the top level
 * and recursively walked so dot-path fields (e.g. ext.featured.AT) are captured.
 */
export function flattenRhfErrors(
  errors: FieldErrors,
): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [key, val] of Object.entries(errors)) {
    if (!val) continue;

    if (key === "ext" && typeof val === "object" && !("message" in val)) {
      // Promote ext.fieldName errors to top-level fieldName.
      // Recurse into nested objects for dot-path fields (e.g. ext.featured.AT).
      const walkExtErrors = (obj: FieldErrors, prefix: string): void => {
        for (const [k, v] of Object.entries(obj)) {
          if (!v) continue;
          const path = prefix ? `${prefix}.${k}` : k;
          const msg = (v as { message?: string })?.message;
          if (msg) {
            flat[path] = msg;
          } else if (typeof v === "object") {
            walkExtErrors(v as FieldErrors, path);
          }
        }
      };
      walkExtErrors(val as FieldErrors, "");
    } else {
      const msg = (val as { message?: string })?.message;
      if (msg) flat[key] = msg;
    }
  }

  return flat;
}
