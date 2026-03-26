import { describe, it, expect } from 'vitest';
import { buildExtZodSchema } from './build-ext-zod-schema';
import type { ExtFieldDef } from '@/shared/types/ext-field-def';

function field(overrides: Partial<ExtFieldDef> = {}): ExtFieldDef {
  return {
    type: 'string', title: 'Field', required: false,
    category: 'General', displayOrder: 0,
    showInList: false, searchable: false, sortable: false,
    ...overrides,
  };
}

describe('buildExtZodSchema', () => {
  it('returns z.record(z.unknown()) when extFields is undefined', () => {
    const schema = buildExtZodSchema(undefined);
    expect(schema.safeParse({ anything: 'ok' }).success).toBe(true);
  });

  it('returns z.record(z.unknown()) when extFields is empty object', () => {
    const schema = buildExtZodSchema({});
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('maps string field to z.string()', () => {
    const schema = buildExtZodSchema({ myField: field({ type: 'string' }) });
    expect(schema.safeParse({ myField: 'hello' }).success).toBe(true);
  });

  it('maps number field to coerced number', () => {
    const schema = buildExtZodSchema({ count: field({ type: 'number' }) });
    const result = schema.safeParse({ count: '42' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.count).toBe(42);
  });

  it('maps integer field to coerced integer', () => {
    const schema = buildExtZodSchema({ qty: field({ type: 'integer' }) });
    const result = schema.safeParse({ qty: '5' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.qty).toBe(5);
  });

  it('maps boolean field to z.boolean()', () => {
    const schema = buildExtZodSchema({ flag: field({ type: 'boolean' }) });
    expect(schema.safeParse({ flag: true }).success).toBe(true);
    expect(schema.safeParse({ flag: false }).success).toBe(true);
  });

  it('maps enum field to z.enum', () => {
    const schema = buildExtZodSchema({
      color: field({ type: 'string', enum: ['red', 'blue'] }),
    });
    expect(schema.safeParse({ color: 'red' }).success).toBe(true);
    expect(schema.safeParse({ color: 'green' }).success).toBe(false);
  });

  it('makes non-required string fields optional (empty string passes)', () => {
    const schema = buildExtZodSchema({ desc: field({ type: 'string', required: false }) });
    expect(schema.safeParse({ desc: '' }).success).toBe(true);
  });

  it('makes required string fields fail on empty string', () => {
    const schema = buildExtZodSchema({ name: field({ type: 'string', required: true }) });
    expect(schema.safeParse({ name: '' }).success).toBe(false);
    expect(schema.safeParse({ name: 'hello' }).success).toBe(true);
  });

  it('skips isParent fields', () => {
    const schema = buildExtZodSchema({
      parentObj: field({ isParent: true }),
      child: field({ type: 'string' }),
    });
    // parentObj should not appear in schema shape
    const result = schema.safeParse({ child: 'ok' });
    expect(result.success).toBe(true);
  });

  it('passes through unknown fields via .passthrough()', () => {
    const schema = buildExtZodSchema({ name: field({ type: 'string' }) });
    const result = schema.safeParse({ name: 'ok', _meta: { foo: 1 } });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data._meta).toEqual({ foo: 1 });
  });

  it('required number rejects undefined', () => {
    const schema = buildExtZodSchema({ cost: field({ type: 'number', required: true }) });
    // undefined is not coercible to number by z.coerce.number() → NaN → fails
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('non-required boolean defaults to false', () => {
    const schema = buildExtZodSchema({ flag: field({ type: 'boolean', required: false }) });
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.flag).toBe(false);
  });

  it('required boolean rejects undefined', () => {
    const schema = buildExtZodSchema({ flag: field({ type: 'boolean', required: true }) });
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('optional enum accepts empty string', () => {
    const schema = buildExtZodSchema({
      color: field({ type: 'string', enum: ['red', 'blue'], required: false }),
    });
    expect(schema.safeParse({ color: '' }).success).toBe(true);
    expect(schema.safeParse({ color: 'red' }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('required enum rejects empty string', () => {
    const schema = buildExtZodSchema({
      color: field({ type: 'string', enum: ['red', 'blue'], required: true }),
    });
    expect(schema.safeParse({ color: '' }).success).toBe(false);
    expect(schema.safeParse({ color: 'red' }).success).toBe(true);
  });

  it('falls through to string for unknown type', () => {
    const schema = buildExtZodSchema({
      data: field({ type: 'array' }),
    });
    expect(schema.safeParse({ data: 'ok' }).success).toBe(true);
  });
});
