---
name: ui-standards
description: CSS, styling, and component architecture standards for rcx-ui. Use when creating a new UI component, modifying styles on an existing component, or reviewing any JSX/TSX file for standard compliance. Covers color tokens, sizing tokens, typography, inline style rules, border radius, CVA variants, and Tailwind 4 gotchas.
allowed-tools: Read, Grep, Glob
---

# RCX UI Standards

Apply these rules to all new and modified UI code. They are **enforced** — non-compliant code must be fixed before merging.

> **Exception — login page** (`src/features/auth/pages/login-page.tsx`): Exempt from these rules. It is a unique marketing/brand surface where raw Tailwind classes, arbitrary values, and one-off spacing are acceptable.

---

## 1. No Hardcoded Colors

Never use hex literals or named Tailwind palette colors in JSX. Use design system tokens:

```tsx
// ❌ Wrong
<div className="bg-[#F47A20] text-white text-blue-600" />

// ✓ Correct
<div className="bg-brand text-foreground-inverse text-accent-sky" />
```

All tokens are registered in `@theme` in `src/index.css`. Available color utilities:

| Group | Utilities |
|---|---|
| **Brand** | `bg-brand`, `text-brand`, `hover:bg-brand-hover`, `bg-brand-light` |
| **Surfaces** | `bg-page`, `bg-card`, `bg-subtle`, `bg-sidebar`, `bg-dark-surface` |
| **Text** | `text-foreground`, `text-foreground-secondary`, `text-foreground-muted`, `text-foreground-inverse` |
| **Borders** | `border-border`, `border-border-strong` |
| **State — solid** | `bg-success`, `bg-info`, `bg-warning`, `bg-error` |
| **State — light bg** | `bg-success-light`, `bg-info-light`, `bg-warning-light`, `bg-error-light` |
| **State — on-color text** | `text-on-success`, `text-on-info`, `text-on-warning`, `text-on-error` |
| **Accents** | `bg-accent-{amber,teal,indigo,rose,violet,sky,emerald}`, `bg-accent-*-light`, `text-accent-*` |

---

## 2. No Arbitrary Pixel Values

Never use `text-[Npx]`, `w-[Npx]`, `h-[Npx]`, `min-h-[Npx]`, `max-h-[Npx]`, or bare `[Nrem]` arbitrary values. Use:

- **Named CSS variable tokens**: `max-h-[var(--height-dropdown-max)]`, `w-[var(--width-search-bar)]`
- **Tailwind 4 numeric scale** for standard sizes: `h-8` (32px), `h-9` (36px), `h-11` (44px), `w-60` (240px)

### Sizing tokens (`src/index.css`)

| Token | Value | Use |
|---|---|---|
| `--width-search-bar` | 240px | Search bar inputs |
| `--width-popover-sm` | 280px | Narrow popovers/filters |
| `--width-popover-md` | 320px | Standard popovers |
| `--width-form-max` | 600px | Max-width of single-column forms |
| `--width-tier-panel` | 220px | Tier level list sidebar |
| `--width-auth-card` | 24rem | Login/auth form card |
| `--width-auth-hero-text` | 26rem | Login hero text block |
| `--modal-width-sm` | 400px | Small modals |
| `--modal-width-md` | 480px | Standard modals |
| `--modal-width-lg` | 560px | Large modals / command palette |
| `--height-dropdown-max` | 240px | Popovers, select lists |
| `--height-dropdown-sm` | 200px | Compact dropdown lists |
| `--height-dropdown-lg` | 380px | Larger dropdown areas |
| `--height-split-pane` | 480px | Full split-pane editor |
| `--height-split-pane-sm` | 420px | Narrow split-pane |
| `--height-table-max` | 600px | Virtualized table |
| `--button-height` | 44px | Default button |
| `--button-height-sm` | 36px | Small button |
| `--button-height-lg` | 52px | Large button |

---

## 3. Typography — Named Utilities Only

All font sizes must use a named `@utility` from `src/index.css`. Never use `text-sm`, `text-xs`, `text-base`, `text-lg`, or `text-[Npx]`.

| Utility | Size | Weight | Use |
|---|---|---|---|
| `text-display` | 3.5rem | 800 | Hero/marketing headings |
| `text-h1` | 40px | 700 | Page-level headings |
| `text-h2` | 32px | 700 | Section headings |
| `text-h3` | 24px | 600 | Card/widget headings |
| `text-h4` | 20px | 600 | Sub-section headings |
| `text-body-lg` | 18px | 400 | Large body text |
| `text-body` | 16px | 400 | Standard body text |
| `text-body-sm` | 14px | 400 | Secondary body, inputs |
| `text-label` | 13px | 500 | Dense form labels, table cells |
| `text-caption` | 12px | 400 | Captions, hints, metadata |
| `text-caption-xs` | 11px | 400 | Extra-small annotations |
| `text-metric` | 56px | 800 | KPI numbers |

> **Button sizes** — use `text-button` (14px), `text-button-sm` (13px), `text-button-lg` (16px). These set font-size only (no line-height) to preserve icon-text alignment. Already applied in `Button` via CVA — do not override manually.

---

## 4. No Inline `style={{}}` for Visual Properties

Use class-based styling. Acceptable inline styles (exceptions):
- Virtual scroll offsets: `style={{ height: virtualRow.start }}`
- Conditional CSS variable references: `style={{ width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)" }}`
- User-defined colors stored in the database: `style={{ backgroundColor: tier.color }}`

---

## 5. Border Radius

Use `@theme` tokens. Never use `rounded-[Npx]`:

| Class | Value |
|---|---|
| `rounded-sm` | 4px |
| `rounded-md` | 8px |
| `rounded-lg` | 12px |
| `rounded-xl` | 16px |
| `rounded-pill` | 9999px |

---

## 6. Component Variants via CVA

All UI primitives with visual variants (Button, Badge, etc.) must use **class-variance-authority (CVA)**. Variants must reference CSS variable tokens, not hardcoded values.

```tsx
// ✓ Correct — tokens only
const variants = cva("...", {
  variants: {
    intent: {
      brand: "bg-brand text-foreground-inverse hover:bg-brand-hover",
      error: "bg-error text-foreground-inverse hover:bg-error-hover",
    },
  },
});
```

---

## 7. Class Merging

Always use `cn()` from `src/shared/lib/cn.ts` to merge Tailwind classes — never concatenate strings manually. `cn()` is a custom `clsx` + `tailwind-merge` instance that understands our typography utilities and prevents class conflicts.

```tsx
import { cn } from "@/shared/lib/cn";

<div className={cn("base-classes", conditional && "extra-class", className)} />
```

---

## Tailwind 4 Gotchas

- **Named max-width utilities** (`max-w-md`, `max-w-sm`) may not resolve correctly. Use CSS var tokens instead: `max-w-[var(--width-form-max)]`.
- **cmdk `Command` root** collapses to content width. Use a plain `<input>` for inline search fields; use cmdk only for dropdown result lists.
- **Custom typography utilities** (`text-label`, `text-body-sm`, etc.) are registered in the `font-size` class group in `cn.ts` so tailwind-merge treats them correctly — adding new typography `@utility` classes requires updating `cn.ts` too.
