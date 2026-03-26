import { useRef, useCallback, type JSX } from "react";
import { cn } from "@/shared/lib/cn";

const FOCUSABLE =
  'input:not([type="hidden"]):not([type="checkbox"]), textarea, select, button[role="combobox"]';

interface BulkFieldProps {
  fieldKey: string;
  enabled: boolean;
  mixed: boolean;
  onToggle: (key: string) => void;
  children: React.ReactNode;
}

/**
 * Wrapper for bulk-edit fields — adds an enable/disable checkbox
 * and mixed-value indicator.
 */
export function BulkField({
  fieldKey,
  enabled,
  mixed,
  onToggle,
  children,
}: BulkFieldProps): JSX.Element {
  const fieldRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    const wasDisabled = !enabled;
    onToggle(fieldKey);
    // When enabling, focus the first input inside the field
    if (wasDisabled) {
      requestAnimationFrame(() => {
        const el = fieldRef.current?.querySelector<HTMLElement>(FOCUSABLE);
        if (el) {
          el.focus();
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.select();
          }
        }
      });
    }
  }, [enabled, onToggle, fieldKey]);

  return (
    <div className="flex gap-3 items-start">
      <label className="mt-7 flex-shrink-0">
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          data-testid={`bulk-field-${fieldKey}-toggle`}
          aria-label={`Toggle ${fieldKey}`}
          className="h-4 w-4 rounded-sm border-border-strong accent-brand cursor-pointer"
        />
      </label>
      <div
        ref={fieldRef}
        className={cn(
          "flex-1 min-w-0",
          !enabled && "opacity-50 pointer-events-none",
        )}
      >
        {children}
        {!enabled && mixed && (
          <span className="text-caption text-foreground-muted italic">
            (mixed)
          </span>
        )}
      </div>
    </div>
  );
}
