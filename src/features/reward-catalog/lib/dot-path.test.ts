import { describe, it, expect } from 'vitest';
import { flattenNested, unflattenDotPaths, summarizeNested } from '@/shared/lib/dot-path';

describe('flattenNested', () => {
  it('flattens one level of nested objects into dot-path keys', () => {
    const result = flattenNested({
      featured: { AT: true, BR: false },
    });
    expect(result).toEqual({ 'featured.AT': true, 'featured.BR': false });
  });

  it('passes through scalar values unchanged', () => {
    const result = flattenNested({ brandCode: 'X', count: 42 });
    expect(result).toEqual({ brandCode: 'X', count: 42 });
  });

  it('passes through arrays as-is (not flattened)', () => {
    const result = flattenNested({ tags: ['a', 'b'] });
    expect(result).toEqual({ tags: ['a', 'b'] });
  });

  it('handles mix of scalar and nested values', () => {
    const result = flattenNested({
      brandCode: 'X',
      featured: { AT: true },
      count: 5,
    });
    expect(result).toEqual({
      brandCode: 'X',
      'featured.AT': true,
      count: 5,
    });
  });

  it('handles null values as scalars', () => {
    const result = flattenNested({ field: null });
    expect(result).toEqual({ field: null });
  });

  it('returns empty object for empty input', () => {
    expect(flattenNested({})).toEqual({});
  });

  it('handles multiple nested objects', () => {
    const result = flattenNested({
      featured: { AT: true },
      affl: { code: 'ABC' },
    });
    expect(result).toEqual({
      'featured.AT': true,
      'affl.code': 'ABC',
    });
  });
});

describe('unflattenDotPaths', () => {
  it('reassembles dot-path keys into nested objects', () => {
    const result = unflattenDotPaths({
      'featured.AT': true,
      brandCode: 'X',
    });
    expect(result).toEqual({
      featured: { AT: true },
      brandCode: 'X',
    });
  });

  it('groups multiple children under the same parent', () => {
    const result = unflattenDotPaths({
      'featured.AT': true,
      'featured.BR': false,
      'featured.GP': true,
    });
    expect(result).toEqual({
      featured: { AT: true, BR: false, GP: true },
    });
  });

  it('passes through non-dot-path keys unchanged', () => {
    const result = unflattenDotPaths({ brandCode: 'X', count: 42 });
    expect(result).toEqual({ brandCode: 'X', count: 42 });
  });

  it('returns empty object for empty input', () => {
    expect(unflattenDotPaths({})).toEqual({});
  });

  it('overwrites scalar with object if dot-path conflicts', () => {
    const result = unflattenDotPaths({
      featured: 'scalar',
      'featured.AT': true,
    });
    // The dot-path version should win by creating an object
    expect(result).toEqual({ featured: { AT: true } });
  });

  it('roundtrips with flattenNested', () => {
    const original = {
      featured: { AT: true, BR: false },
      brandCode: 'X',
    };
    const flat = flattenNested(original);
    const restored = unflattenDotPaths(flat);
    expect(restored).toEqual(original);
  });
});

describe('summarizeNested', () => {
  it('returns empty string for null/undefined', () => {
    expect(summarizeNested(null)).toBe('');
    expect(summarizeNested(undefined)).toBe('');
  });

  it('joins array values with comma', () => {
    expect(summarizeNested(['a', 'b', 'c'])).toBe('a, b, c');
  });

  it('shows truthy keys for boolean map objects', () => {
    expect(summarizeNested({ AT: true, BR: false, GP: true })).toBe('AT, GP');
  });

  it('shows "N items" for non-boolean objects', () => {
    expect(summarizeNested({ a: 1, b: 2, c: 3 })).toBe('3 items');
  });

  it('returns string representation of scalar values', () => {
    expect(summarizeNested(42)).toBe('42');
    expect(summarizeNested('hello')).toBe('hello');
    expect(summarizeNested(true)).toBe('true');
  });

  it('returns empty string for all-false boolean maps', () => {
    expect(summarizeNested({ AT: false, BR: false })).toBe('');
  });
});
