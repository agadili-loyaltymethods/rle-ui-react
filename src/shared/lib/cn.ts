import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Custom tailwind-merge instance that knows about our @utility typography
 * classes. Without this, twMerge may treat text-label / text-body-sm / etc.
 * as textColor utilities, silently removing variant color classes like
 * text-foreground-inverse or text-[var(--button-ghost-color)].
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        "text-display",
        "text-h1",
        "text-h2",
        "text-h3",
        "text-h4",
        "text-body-lg",
        "text-body",
        "text-body-sm",
        "text-label",
        "text-caption",
        "text-caption-xs",
        "text-metric",
        "text-button",
        "text-button-sm",
        "text-button-lg",
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
