/**
 * Check whether a field has different values across multiple items.
 * Uses JSON.stringify for deep comparison.
 *
 * @param isExt - If true, reads from `item.ext[field]` instead of `item[field]`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMixedValue(
  items: readonly any[],
  field: string,
  isExt: boolean,
): boolean {
  if (items.length <= 1) return false;
  const getValue = (item: Record<string, unknown>): unknown => {
    if (isExt) return (item.ext as Record<string, unknown> | undefined)?.[field];
    return item[field];
  };
  const first = items[0];
  if (!first) return false;
  const firstStr = JSON.stringify(getValue(first));
  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    if (JSON.stringify(getValue(item)) !== firstStr) return true;
  }
  return false;
}
