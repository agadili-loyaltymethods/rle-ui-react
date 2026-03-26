# AWS QuickSight Dashboard Embedding

## Context

The Analytics page (`/analytics`) is currently a placeholder. The user has existing dashboards built in AWS QuickSight and wants to embed them into the app. Auth model: a single shared QuickSight user identity generates all embed URLs; the app's own JWT auth gates page access. No per-user QuickSight provisioning needed.

## Architecture

```
Browser (rcx-ui)                    Express Server (rcx-ui)              AWS
┌──────────────────┐   GET          ┌──────────────────┐   AWS SDK      ┌────────────┐
│ QuickSightEmbed  │ ─────────────> │ /api/quicksight│ ────────────> │ QuickSight │
│ component (ref)  │   embed URL    │ /embed-url        │   generate    │ Service    │
│                  │ <───────────── │                   │ <──────────── │            │
└──────────────────┘   { embedUrl } └──────────────────┘   signed URL   └────────────┘
```

The endpoint lives on the rcx-ui Express server (not rle-api) under `/api/quicksight/embed-url`, mounted BEFORE the rle-api proxy so it's intercepted locally. In dev, a Vite proxy rule forwards this path to the Express server (run via `npm run dev:server`).

## Implementation

### Step 1: Install dependency

```bash
npm install amazon-quicksight-embedding-sdk
```

(`@aws-sdk/client-quicksight` is a server-side dep — added later when wiring the backend)

### Step 2: Dashboard config file — `src/features/analytics/config/dashboard-config.ts` (NEW)

Static TypeScript config defining available dashboards. IDs are placeholders the user replaces with real QuickSight dashboard IDs.

```ts
export interface DashboardConfig {
  id: string;           // QuickSight dashboard ID
  labelKey: string;     // i18n key in analytics namespace
  fallbackLabel: string;
  icon: LucideIcon;
}

export const DASHBOARDS: DashboardConfig[] = [
  { id: "REPLACE_ID_1", labelKey: "dashboards.overview", fallbackLabel: "Overview", icon: BarChart3 },
  { id: "REPLACE_ID_2", labelKey: "dashboards.members", fallbackLabel: "Members", icon: Users },
  // ... more dashboards
];
```

### Step 3: Embed URL hook — `src/features/analytics/hooks/use-embed-url.ts` (NEW)

TanStack Query hook fetching `GET /api/quicksight/embed-url?dashboardId=X&theme=light|dark`.

Key settings: `staleTime: 0`, `gcTime: 0` (embed URLs are single-use), `refetchOnWindowFocus: false`, `retry: 1`. Uses existing `apiClient` (auth headers auto-injected). Reads theme from `useUIStore`.

### Step 4: Not-configured placeholder — in the embed component

When the embed URL endpoint returns an error (e.g., backend not configured), show a friendly placeholder: icon, "Analytics Not Configured" heading, and a short message like "Connect your AWS QuickSight account to view dashboards here." This provides a clean dev experience before the backend is wired up.

### Step 5: Embed component — `src/features/analytics/components/quicksight-dashboard.tsx` (NEW)

Ref-based wrapper around the QuickSight Embedding SDK:
- Creates `EmbeddingContext` via `createEmbeddingContext()`
- Calls `context.embedDashboard({ url, container, width: "100%", height: "100%" })`
- Uses `setTimeout(0)` to avoid React 19 StrictMode double-run
- Tracks state via `onMessage` callback: `CONTENT_LOADED` → loaded, `ERROR_OCCURRED` → error
- Shows loading spinner overlay while URL is fetched and iframe loads
- Shows error state with retry button on failure
- Clears container innerHTML on re-embed (tab switch remounts component with fresh URL)

### Step 6: Analytics page — `src/features/analytics/pages/analytics-page.tsx` (REPLACE)

Replace placeholder with Radix Tabs layout (same pattern as `tier-groups-page.tsx`):
- One tab per dashboard from `DASHBOARDS` config
- Active tab tracks which `QuickSightDashboard` renders
- Only the active tab's component mounts (prevents wasting one-time embed URLs)
- Page header with title + icon
- Dashboard fills remaining viewport height: `h-[calc(100vh-220px)]`

### Step 7: Translation updates

**`public/locales/en/analytics.json`** — add `dashboards.*` and `errors.*` keys
**`public/locales/ja/analytics.json`** — add Japanese translations

### Step 8: Server endpoint — `server/src/routes/quicksight.ts` (NEW)

Express route using `@aws-sdk/client-quicksight`:
- `GET /api/quicksight/embed-url?dashboardId=X&theme=light|dark`
- Validates bearer token is present (lightweight auth gate)
- Validates `dashboardId` against allow-list from env var
- Calls `GenerateEmbedUrlForRegisteredUserCommand` with shared user ARN
- Optionally applies theme ARN based on `theme` param
- Returns `{ embedUrl: "..." }`

### Step 9: Server wiring — `server/src/app.ts` (MODIFY)

- Register QuickSight route BEFORE the rle-api proxy (`app.use("/api/quicksight", ...)` before `app.use("/api", createApiProxy(...))`)
- Add Helmet CSP: `frameSrc: ["'self'", "https://*.quicksight.aws.amazon.com"]`

### Step 10: Server config — `server/src/config.ts` (MODIFY)

Add env vars to Zod schema:
- `AWS_REGION` (default "us-east-1")
- `AWS_ACCOUNT_ID`
- `QS_USER_ARN` (shared registered user ARN)
- `QS_ALLOWED_DASHBOARD_IDS` (comma-separated)
- `QS_THEME_ARN_LIGHT`, `QS_THEME_ARN_DARK` (optional)
- `QS_SESSION_LIFETIME_MINUTES` (default 600)

### Step 11: Vite dev proxy — `vite.config.ts` (MODIFY)

Add proxy rule for QuickSight endpoint in dev:
```ts
proxy: {
  "/api/quicksight": { target: "http://localhost:4001", changeOrigin: true },
  "/api": { target: "http://localhost:3000", changeOrigin: true },
}
```
More specific routes go first. Dev server can be started via `PORT=4001 npm run dev:server`.

### Step 12: Vite manual chunks — `vite.config.ts` (MODIFY)

Add `quicksight: ["amazon-quicksight-embedding-sdk"]` to `manualChunks` so the SDK is code-split.

## Files Summary

| File | Action |
|------|--------|
| `src/features/analytics/config/dashboard-config.ts` | CREATE |
| `src/features/analytics/hooks/use-embed-url.ts` | CREATE |
| `src/features/analytics/components/quicksight-dashboard.tsx` | CREATE |
| `src/features/analytics/pages/analytics-page.tsx` | REPLACE |
| `public/locales/en/analytics.json` | MODIFY |
| `public/locales/ja/analytics.json` | MODIFY |
| `server/src/routes/quicksight.ts` | CREATE |
| `server/src/app.ts` | MODIFY |
| `server/src/config.ts` | MODIFY |
| `vite.config.ts` | MODIFY |

## AWS Prerequisites

Before the integration works end-to-end, the following must be set up in the AWS console:

1. **QuickSight Enterprise Edition** — required for embedding
2. **Registered user** — create a shared service user in QuickSight (e.g., `embed-service-user`)
3. **Domain allowlist** — add your app domain(s) in QuickSight > Manage QuickSight > Domains and Embedding (`localhost:4000` for dev, production domain for prod)
4. **IAM permissions** — the server needs an IAM role/credentials with `quicksight:GenerateEmbedUrlForRegisteredUser`
5. **Dashboard sharing** — each dashboard must be shared with the service user
6. **(Optional) Custom themes** — create light/dark QuickSight themes for dark mode support

## Environment Variables

```env
# AWS QuickSight (server-side)
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
QS_USER_ARN=arn:aws:quicksight:us-east-1:123456789012:user/default/embed-service-user
QS_ALLOWED_DASHBOARD_IDS=dashboard-id-1,dashboard-id-2,dashboard-id-3
QS_SESSION_LIFETIME_MINUTES=600
# Optional: custom theme ARNs for dark mode support
QS_THEME_ARN_LIGHT=
QS_THEME_ARN_DARK=
```

## Verification

1. `npm run build` — zero type errors, builds successfully
2. Navigate to `/analytics` — tabs render for each configured dashboard
3. Without backend configured — friendly "Analytics Not Configured" placeholder with setup instructions
4. With backend configured — loading spinner, then QuickSight dashboard renders in iframe
5. Switch tabs — previous dashboard unmounts, new one fetches fresh embed URL
6. Toggle dark/light mode — theme param changes in embed URL request
7. Error recovery — retry button re-fetches embed URL on failure
