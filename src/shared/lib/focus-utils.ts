/**
 * Modal/drawer focus utilities.
 *
 * - `handleOpenAutoFocus`: prevents Radix default focus and focuses + selects
 *   the first enabled text input/textarea/combobox inside the dialog.
 * - `handleAutoSelectOnFocus`: attach as `onFocus` on a container to auto-select
 *   text in any input/textarea that receives focus.
 */

const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), textarea:not([disabled]), button[role="combobox"]';

/**
 * Check if an element or any ancestor up to `boundary` has pointer-events: none,
 * which means the field is visually disabled even if not HTML-disabled.
 */
function isPointerBlocked(el: HTMLElement, boundary: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  while (node && node !== boundary) {
    if (getComputedStyle(node).pointerEvents === "none") return true;
    node = node.parentElement;
  }
  return false;
}

/** Radix `onOpenAutoFocus` handler — focuses & selects the first enabled field. */
export function handleOpenAutoFocus(e: Event): void {
  e.preventDefault();
  const container = e.currentTarget as HTMLElement | null;
  if (!container) return;
  requestAnimationFrame(() => {
    const candidates = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    for (const el of candidates) {
      if (!isPointerBlocked(el, container)) {
        el.focus();
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.select();
        }
        return;
      }
    }
  });
}

/** Attach as `onFocus` on a container to auto-select text when any child input gets focus. */
export function handleAutoSelectOnFocus(e: React.FocusEvent): void {
  const t = e.target;
  if (t instanceof HTMLInputElement && t.type !== "checkbox") t.select();
  if (t instanceof HTMLTextAreaElement) t.select();
}
