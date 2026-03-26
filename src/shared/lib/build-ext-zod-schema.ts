import { z } from 'zod';
import type { ExtFieldDef } from '@/shared/types/ext-field-def';

/**
 * Converts a map of API extension field definitions into a Zod object schema.
 * Generic — works for any model with extension fields, not reward-specific.
 *
 * Always returns a z.ZodObject (with passthrough) so consumers can safely
 * access `.shape` without instanceof checks.
 */
export function buildExtZodSchema(
  extFields: Record<string, ExtFieldDef> | undefined,
): z.ZodObject<z.ZodRawShape> {
  if (!extFields || Object.keys(extFields).length === 0) {
    return z.object({}).passthrough();
  }

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [fieldName, def] of Object.entries(extFields)) {
    if (def.isParent) continue;

    let fieldSchema: z.ZodTypeAny;

    if (def.enum && def.enum.length > 0) {
      const [first, ...rest] = def.enum as [string, ...string[]];
      const enumSchema = z.enum([first, ...rest]);
      fieldSchema = def.required ? enumSchema : enumSchema.or(z.literal('')).optional();
    } else if (def.type === 'boolean') {
      fieldSchema = def.required ? z.boolean() : z.boolean().optional().default(false);
    } else if (def.type === 'number' || def.type === 'integer') {
      const numSchema = z.coerce.number();
      fieldSchema = def.required ? numSchema : numSchema.optional();
    } else {
      // string, date, date-time, uri, url, etc.
      fieldSchema = def.required
        ? z.string().min(1, `${def.title || fieldName} is required`)
        : z.string();
    }

    shape[fieldName] = fieldSchema;
  }

  return z.object(shape).passthrough();
}
