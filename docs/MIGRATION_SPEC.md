# ReactorCX Loyalty Platform — UX Modernization Spec

## 1. Executive Summary

**Project:** Migrate the ReactorCX (RCX) loyalty management platform from a legacy AngularJS 1.5.8 UI (`rle-ui`) to a modern, highly usable frontend (`rcx-ui`) while retaining the existing Node.js/Express/MongoDB API (`rle-api`) as the backend.

**Current State:**
- **rle-ui**: AngularJS 1.5.8, Bower, Gulp, jQuery, SmartAdmin template, Bootstrap 3, Font Awesome 4, JointJS (flow diagrams). Node 8 era codebase. ~90 data models, 28+ distinct routes, 27 controller modules, 30+ custom directives.
- **rle-api**: Node.js 18, Express, MongoDB/Mongoose, Kafka event pipeline, JWT+OIDC auth, auto-generated REST endpoints via express-restify-mongoose. Mature, well-structured — *this remains unchanged*.

**Reference-Only Repositories (DO NOT MODIFY):**
- **rle-api** — The existing Node.js/Express/MongoDB backend. Used as a reference for API endpoints, data models, and auth patterns. No changes will be made to this codebase.
- **rle-ui** — The legacy AngularJS 1.5.8 frontend. Used as a reference for understanding existing features, routes, and business logic. No changes will be made to this codebase.
- **rcx-packages** — Shared packages (model definitions, utilities). Used as a reference for Mongoose schemas, model relationships, and field definitions. No changes will be made to this codebase.

All three repositories exist solely to inform the design and implementation of `rcx-ui`. They are not build targets, not dependencies, and should never be modified as part of this project.

**Goal:** Build a dramatically more usable, modern, and visually polished admin interface that:
- Replaces all existing rle-ui functionality
- Introduces modern UX patterns (command palette, contextual actions, smart navigation)
- Is built on a modern stack that supports rapid iteration
- Maintains full API compatibility with rle-api v1

---

## 2. Current Application Analysis

### 2.1 Technology Stack (Current)

| Layer | Current | Issues |
|-------|---------|--------|
| Framework | AngularJS 1.5.8 | EOL since 2021, no security patches |
| Build | Gulp + Bower | Obsolete toolchain |
| UI Kit | SmartAdmin + Bootstrap 3 | Dated visual design, dense layouts |
| Charts | Custom directives | Limited interactivity |
| Flow Editor | JointJS | Functional but crude UX |
| State Mgmt | $scope + services | Implicit, hard to trace |
| Auth | JWT + cookie-based session | Works, but UI session handling is fragile |
| Node runtime | 8.11.4 (UI server) | Critically outdated |
| i18n | Custom `_:` prefix translation | Bespoke, fragile |

### 2.2 Feature Inventory

The application has **6 major functional domains**:

#### A. Member Management (Home page)
- Member search (first name, last name, phone, email, loyalty ID)
- Member list with `dynamic-list-view` (paginated, filterable table)
- Add/Edit member via dynamic modal
- **Member Detail** (tabbed sub-views):
  - Activities (default tab)
  - Rewards
  - Purses (point balances)
  - Purse Histories
  - Badges
  - Tiers
  - Loyalty IDs
  - Referrals
  - Transactions
  - Preferences
  - Offers
  - Merge Histories
  - Segments
  - Terms & Conditions
  - Streaks (with Goals)
  - Streak Histories
  - Notes
  - Loyalty Cards
  - Aggregates

#### B. Program Configuration
- Program list/CRUD
- **Policies** (tabbed sub-views per program):
  - Reward Policies (in new UI: split into Rewards Catalog, Benefits Catalog, Discounts — see §5.4)
  - Purse Policies
  - Tier Policies
  - Partners
  - Promo Policies
  - Promo Code Definitions
  - Streak Policies
  - Aggregate Policies
- **Rules** — hierarchical rule view with folders
- **Rule Builder** — complex visual builder for conditions + actions (~1,650 lines of controller logic)
  - Condition builder with expression support
  - Action builder (addPoints, redeemPoints, issueReward, etc.)
  - Custom data, location, and product selectors
  - Rule effective dates, budgets, count limits
- **Flow Composer** — JointJS-based visual flow editor
  - Drag-and-drop rule blocks
  - Link rules into execution flows
  - Validate, save, publish/unpublish flows

#### C. Reference Data
- Organizations
- Segments
- Locations
- Products
- DMAs (Designated Market Areas)
- Enums (dynamic enumeration management)
- Named Lists (dynamic list-based filtering) + Named List Data (resolved rows)
- Loyalty Cards (card type definitions)

#### D. Settings & Administration
- My Account (user settings)
- User Management
- Security Setup (ACL/roles)
- Extensions (schema extensibility)
- Limits (rate/usage limits)
- Divisions (data partitioning)
- MCP UI Config (configurable UI metadata) — **out of scope for new UI, see §10**

#### E. Analytics
- Members by DMA
- Members by Tier
- Members by Enroll Source
- Members by Enroll Channel
- Members by Segment
- Promotion Participation
- Purse Balances
- Reward Balances
- Reward Redemption
- Offer Redemption
- Product Redemption
- Top Products
- Average Ticket

#### F. Shared Components / Patterns
- `dynamic-list-view` — the core reusable data table (pagination, filtering, column config)
- `dynamic-modal-element` / `dynamic-modal-row` — schema-driven form modals
- `lm-advanced-search` — complex search/filter builder
- `expression-builder` — loyalty rule expression editor
- `action-builder` — rule action configuration
- `schema-builder` / `schema-definitions` — extension field schema management
- `lm-rules-tree-view` — hierarchical rule folder display
- `query-builder` — MongoDB query construction
- `wizard` — multi-step workflow component
- `lm-intellisense` — autocomplete for rule expressions
- `lm-analytics-filter` — chart filtering
- `lm-bar-chart` / `lm-pie-bar-chart` — chart components
- ACL/permission system — fine-grained read/create/update/delete per entity

### 2.3 Current UX Pain Points

1. **Dated visual design** — SmartAdmin Bootstrap 3 template looks like 2014-era enterprise software
2. **Dense, overwhelming layouts** — Everything visible at once, no progressive disclosure
3. **Navigation friction** — Deeply nested left sidebar with expand/collapse trees; jQuery DOM manipulation for search
4. **Inconsistent patterns** — Mix of inline forms, modals, separate pages for similar operations
5. **No contextual actions** — Must navigate away to perform related operations
6. **Rule builder complexity** — 1,650-line monolithic controller, modal-heavy interaction
7. **Flow composer limitations** — Basic JointJS integration, no undo, limited visual polish
8. **No real-time feedback** — Full page refreshes for many operations
9. **Poor mobile experience** — Responsive breakpoints are minimal and buggy
10. **Brittle i18n** — Custom `_:` prefix approach in every string

---

## 3. Target Architecture

### 3.1 Technology Stack (New)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **React 19** | Industry standard, massive ecosystem, best tooling |
| Meta-framework | **Vite + React Router 7** | Fast builds, file-based routing flexibility |
| Language | **TypeScript 5.x** | Type safety across the entire codebase |
| UI Components | **shadcn/ui + Radix UI + Tailwind CSS 4** | Composable, accessible, highly customizable |
| State Management | **TanStack Query (server state)** + **Zustand (client state)** | Clean separation of server/client concerns |
| Data Tables | **TanStack Table** | Headless, fully customizable, virtual scrolling |
| Forms | **React Hook Form + Zod** | Performant forms with schema validation |
| Charts | **Recharts** or **Tremor** | Modern, React-native charting |
| Flow Editor | **React Flow** | Purpose-built for node-based editors, excellent UX |
| Code/Expression Editor | **Monaco Editor** (lightweight) | IntelliSense-capable expression editing |
| i18n | **react-i18next** | Industry standard, lazy-loading support |
| Icons | **Lucide React** | Clean, consistent icon set |
| Auth | **JWT + OIDC** (match rle-api) | Same auth flow, modern PKCE-based OIDC |
| HTTP Client | **Axios** (via TanStack Query) | Interceptors for auth, consistent with API |
| Testing | **Vitest + Testing Library + Playwright** | Fast unit tests, reliable E2E |

### 3.2 Project Structure

```
rcx-ui/
├── src/
│   ├── app/                    # App shell: root component, providers, router, layout
│   │   ├── router.tsx          # All routes (lazy-loaded, default exports)
│   │   ├── layout.tsx          # AppLayout: auth gate, sidebar + header chrome
│   │   └── providers.tsx       # Global providers (query, auth, i18n, theme)
│   │
│   ├── features/               # Feature modules (vertical slices)
│   │   ├── auth/               # Login page, OIDC callback
│   │   ├── overview/           # Dashboard landing page
│   │   ├── members/            # Member list + detail pages
│   │   ├── programs/           # Program CRUD, activity templates, tier groups,
│   │   │   ├── config/         #   purse policies — each with EntityEditConfig
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── pages/          # ProgramList, ProgramEdit, rules, flow, etc.
│   │   │
│   │   ├── promotions/         # Promotion policies (program-scoped)
│   │   ├── discounts/          # Discount policies (program-scoped)
│   │   ├── reward-catalog/     # Rewards — custom ServerTable composition (§12.1)
│   │   │   ├── config/         #   rewardConfig (ServerTableConfig)
│   │   │   ├── components/     #   Custom drawers, card grid, stats bar
│   │   │   ├── hooks/          #   Mutations, schema, preferences, Zustand store
│   │   │   ├── lib/            #   Cell renderers, form helpers, Zod schemas
│   │   │   └── pages/
│   │   │
│   │   ├── reference-data/     # Segments, Locations, Products, Enums,
│   │   │   ├── segments/       #   Named Lists, Loyalty Cards
│   │   │   ├── locations/      #   Each entity: config/ + pages/ (minimal)
│   │   │   ├── products/
│   │   │   ├── enums/
│   │   │   ├── named-lists/
│   │   │   ├── loyalty-cards/
│   │   │   └── shared/         # ★ ServerTable framework (§12.1)
│   │   │       ├── components/ #   ServerTablePage, EntityFormDrawer, BulkEditDrawer
│   │   │       ├── hooks/      #   useServerTable, useEntitySchema, useBulkOperations
│   │   │       ├── lib/        #   buildColumns, form-tab-helpers
│   │   │       └── types/      #   ServerTableConfig, ColumnDescriptor
│   │   │
│   │   ├── analytics/          # Analytics dashboard
│   │   └── settings/           # Users, ACL, Extensions, Limits, Divisions, Account
│   │
│   ├── shared/
│   │   ├── components/         # See §6 for full inventory
│   │   ├── hooks/              # Generic CRUD hooks, useUserMeta, useColumnChooser, etc.
│   │   ├── lib/                # api-client, cn(), format-utils, build-ext-zod-schema, etc.
│   │   ├── stores/             # Zustand: auth-store, ui-store
│   │   ├── types/              # Domain types (9 files, re-exported from index.ts)
│   │   └── ui/                 # Base primitives: Button, Input, Badge, Card, etc.
│   │
│   └── index.css               # Tailwind 4 + design tokens (@theme blocks)
│
├── public/locales/{en,ja}/     # i18n namespace JSON files
├── e2e/                        # Playwright E2E tests (chromium)
├── docs/plans/                 # Design docs and implementation plans
├── vite.config.ts
└── package.json
```

### 3.3 API Integration Strategy

The new UI communicates exclusively with the existing `rle-api` REST API at `/api/`. No API changes are needed.

**API Client Architecture:**
```
TanStack Query
  └── queryClient (global)
       ├── Queries (GET): useMembers, useProgram, useRules, etc.
       ├── Mutations (POST/PUT/DELETE): useCreateMember, useUpdateRule, etc.
       └── Axios instance
            ├── Base URL: /api/
            ├── Auth interceptor (JWT token injection)
            ├── Error interceptor (401 → redirect to login)
            └── Org/Division headers
```

**Key integration patterns:**
- All existing `express-restify-mongoose` auto-generated CRUD endpoints work as-is
- Custom routes (activity, member-merge, flow publish, etc.) have typed wrappers
- Query invalidation chains mirror the event-driven nature of the API (e.g., submitting an activity invalidates member purses, tiers, rewards)

#### Companion Service (`rcx-aux`)

The core strategy is to **never disrupt rle-api** — it is mature, stable, and shared by other consumers. However, the new UI may need capabilities that don't belong in rle-api (pre-computed aggregations, dashboard-specific queries, UX-driven endpoints that would pollute the core API surface, etc.).

For these cases, a general-purpose companion service (`rcx-aux`) can be introduced:

- **Relationship to rle-api:** Sibling, not replacement. Runs alongside rle-api as an independent Node.js/Express service.
- **Shared infrastructure:** Same MongoDB (read-only where possible), same JWT/OIDC auth, same org/division scoping.
- **Scope:** Catch-all for anything that can't or shouldn't live in rle-api — aggregation endpoints, pre-computed stats, dashboard data, promotion calendar queries, UX-specific helpers, etc.
- **API surface:** Exposed at `/aux/v1/` (or similar), consumed by `rcx-ui` alongside the primary `/api/` endpoints.
- **Deployment:** Independent deploy lifecycle. Can be updated without touching rle-api.
- **Principle:** Start with direct rle-api queries for everything. Introduce `rcx-aux` endpoints only when a use case genuinely can't be served well by rle-api (performance, data shape, separation of concerns).

---

## 4. UX Design Principles

### 4.1 Core Principles

1. **Progressive Disclosure** — Show summary first, reveal detail on demand. No page should overwhelm on first load.
2. **Contextual Actions** — Actions available where data lives. No unnecessary navigation.
3. **Keyboard-First** — Command palette (⌘K), keyboard shortcuts for power users, full keyboard navigation.
4. **Instant Feedback** — Optimistic updates, real-time validation, inline editing where appropriate.
5. **Information Density Control** — Users can toggle between comfortable and compact views.
6. **Consistent Patterns** — Every list page, detail page, and form follows the same interaction patterns.

### 4.2 Visual Design Direction

**Theme:** Clean, professional, light-mode default with dark mode support. The design should feel immediately familiar to users of enterprise SaaS dashboards and marketing automation platforms — specifically **Salesforce**, **HubSpot**, **Braze**, and **Klaviyo** — while drawing visual polish from **linear.app**, **Stripe Dashboard**, and **Vercel's** design language. Users coming from these platforms should recognize common patterns: record-detail layouts, filterable list views, contextual action bars, summary cards with KPIs, and sidebar navigation with collapsible sections.

**Design System Token File:** `design2.json` (root of repo) defines the canonical design tokens for this project — colors, typography, spacing, radii, shadows, z-index, animation timing, and component-level specs (button, card, input, sidebar, badge, table). All component styling must derive from these tokens. Key values:

- **Brand primary:** `#F47A20` (orange), hover `#D86514`, light `#FFE6D2`
- **Typography:** Inter (sans-serif), Menlo/Monaco/Consolas (monospace for IDs and code expressions)
- **Color palette:** Page background `#F7F8FA`, card `#FFFFFF`, sidebar `#F3F4F6`. Text primary `#1F2933`, secondary `#4B5563`, muted `#6B7280`. Semantic: success `#22C55E`, info `#3B82F6`, warning `#F59E0B`, error `#EF4444`.
- **Spacing:** 4px base unit. Scale: xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64) 4xl(96). Page padding 32px, card padding 24px, grid gap 24px.
- **Radii:** sm(4) md(8) lg(12) xl(16) pill(9999)
- **Shadows:** card `0px 1px 3px rgba(0,0,0,0.08)`, hover `0px 4px 12px rgba(0,0,0,0.12)`, dropdown `0px 8px 20px rgba(0,0,0,0.15)`, modal `0px 12px 30px rgba(0,0,0,0.18)`
- **Components:** Buttons 44px height / 8px radius, inputs 44px height / 8px radius with `#F47A20` focus border, sidebar 260px wide with active indicator `#F47A20`, table rows 48px height
- **Cards over tables** for summary views, tables for detailed data
- **Sidebar:** 260px, collapsible to icon-only mode, active item orange indicator bar
- **Breadcrumbs** in main content area (not header) + page headers for clear context
- **Animation:** Fast 150ms, normal 250ms, slow 400ms — all ease-in-out

---

## 5. Feature Specifications

### 5.1 Global Shell

#### Navigation Sidebar
Replace the current jQuery-driven tree menu with a modern sidebar:

```
┌────────────────────────┐
│  [Logo] | Admin Console│ ← RCX logo + separator + label; "RX" badge when collapsed
│                        │
│  ⌂ Overview            │ ← Dashboard/home
│  ⊞ Program             │ ← Program-scoped (uses header program selector)
│  📢 Promotions          │ ← Program-scoped
│  🏷 Discounts           │ ← Program-scoped
│  🎁 Rewards             │ ← Program-scoped (reward catalog)
│  ▤ Reference Data ▸    │ ← Expandable: Segments, Locations, Products,
│                        │   Enumerations, Named Lists, Loyalty Cards
│  ⊞ Analytics           │
│  ⚙ Settings ▸          │ ← Expandable: Users, Security, Extensions,
│                        │   Limits, Divisions
│  ────────────          │
│  ? Help                │
│  ◉ My Account          │
└────────────────────────┘
```

**Implementation:** `src/shared/components/sidebar.tsx` — hierarchical nav with collapsible groups, program selector in header, icon-only collapsed mode (64px), slide-in overlay on mobile. Collapsed/expanded state persists to localStorage. Active item highlighted with orange accent bar. Flyout menus on hover when collapsed.

**Key decisions:**
- **No org selector in sidebar** — org is determined by login credentials
- **No menu filter** — the nav list is short enough to not need filtering
- **Program-context model** — users select a program globally via the header program selector; sidebar items (Program, Promotions, Discounts, Rewards) operate within that selected program context
- **Members and Programs removed** from sidebar — member lookup is via search/command palette; program selection is via the global header selector

**Behavior:**
- Reference Data and Settings expand/collapse to show child items inline
- Sidebar collapses to icon-only mode (64px) on desktop; slide-in overlay on mobile
- Sidebar state (collapsed/expanded) persists across sessions (localStorage)
- Active item highlighted with accent color bar (`#F47A20`)
- Brand area: RCX logo image + "| Admin Console" when expanded; orange "RX" badge when collapsed

#### Command Palette (⌘K / Ctrl+K)
A new global feature for power users:
- **Search anything:** Members by name/ID, programs, rules, reference data
- **Navigate anywhere:** Type page name to jump directly
- **Quick actions:** "Create member", "New rule in [program]", "View flow for [program]"
- **Recent items:** Last 10 visited items

#### Global Header
```
┌──────────────────────────────────────────────────────────┐
│  [☰]  [Program: Acme Rewards  ▾]     [🔍 ⌘K]  [🔔] [👤] │
└──────────────────────────────────────────────────────────┘
```
- Hamburger toggle for sidebar on mobile
- **Program selector** — replaces breadcrumbs in the header; dropdown lists all programs with search, status badges (active/draft), and persists selection to localStorage
- Search trigger (inline search input with dropdown results, also accessible via ⌘K)
- Notifications bell (for async job completions, flow publish results) — backed by the `Job` model (see §5.11)
- User avatar dropdown (profile, logout, theme toggle)

#### Breadcrumbs
Breadcrumbs are rendered **inside the main content area** (above the page content), not in the header. This keeps the header clean for the program selector while still providing navigation context. Non-routable segments (e.g., "Reference Data", "Settings") render as plain text rather than links.

### 5.2 Overview Dashboard (NEW)

A new landing page replacing the current "Members list as homepage" pattern. The dashboard is program-scoped — stats and promotions reflect the program selected in the global header selector.

#### Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Dashboard — Acme Rewards                              [🕐 Month ▾] │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐│
│  │  Members      │ │  Active (Mo) │ │  Revenue (Mo)│ │  Activities ││
│  │  124,567      │ │  23,451      │ │  $1.2M       │ │  89,203     ││
│  │  ↑ 2.3%       │ │  ↑ 5.1%      │ │  ↓ 1.8%      │ │  ↑ 12.4%    ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘│
│                                                                      │
│  ┌─────────────────────────────────┐ ┌──────────────────────────────┐│
│  │  🔥 Promotions                  │ │  📊 Member Activity          ││
│  │                                 │ │                              ││
│  │  ACTIVE NOW                     │ │  [Sparkline — daily active   ││
│  │  ● Double Points Weekend  2d ▸  │ │   members over period]       ││
│  │  ● Summer Bonus           5d ▸  │ │                              ││
│  │                                 │ │  Total    Quarter  Month  Wk ││
│  │  UPCOMING                       │ │  124,567  45,230  23,451  8.2k││
│  │  ○ Fall Campaign     Sep 1  ▸   │ │                              ││
│  │  ○ Holiday Promo     Nov 15 ▸   │ │──────────────────────────────││
│  │                                 │ │  📈 Revenue                   ││
│  │  RECENTLY ENDED                 │ │                              ││
│  │  ◌ Spring Sale      ended 3d ▸  │ │  [Sparkline — daily revenue  ││
│  │  ◌ Loyalty Week     ended 1w ▸  │ │   over period]               ││
│  │                                 │ │                              ││
│  │  [View Promotion Calendar ▸]    │ │  Quarter    Month    Week    ││
│  └─────────────────────────────────┘ │  $4.8M      $1.2M    $312K   ││
│                                      └──────────────────────────────┘│
│                                                                      │
│  ┌─────────────────────────────────┐ ┌──────────────────────────────┐│
│  │  🎁 Rewards Catalog             │ │  🏷️ Discounts & Benefits     ││
│  │                                 │ │                              ││
│  │  RUNNING LOW                    │ │  ACTIVE DISCOUNTS: 12       ││
│  │  ⚠ Free Coffee     12/500      │ │  Top: 20% Off Weekday  (1.2k)││
│  │  ⚠ Concert Tix      3/100      │ │       BOGO Friday     (890) ││
│  │                                 │ │       $5 Off Next     (654) ││
│  │  MOST POPULAR (Mo)              │ │                              ││
│  │  1. Free Coffee       (243)     │ │  ACTIVE BENEFITS: 8         ││
│  │  2. $5 Off Coupon     (189)     │ │  Budget used: $12.4k/$50k   ││
│  │  3. Movie Ticket      (156)     │ │  Issuances this month: 2.3k ││
│  │                                 │ │                              ││
│  │  [View Full Catalog ▸]          │ │  [View All Offers ▸]        ││
│  └─────────────────────────────────┘ └──────────────────────────────┘│
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  ⚡ Quick Actions                                                ││
│  │                                                                  ││
│  │  [+ New Promotion]  [+ New Streak]  [+ New Reward]  [+ Benefit] ││
│  │  [Submit Activity]  [Add Member]    [Import Program]            ││
│  └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

#### Promotions Panel

Promotions are rules that live in promotional rule folders (folders with `promotional: true` flag). The panel groups them by lifecycle state:

- **Active Now:** Rules with `effectiveFrom ≤ now ≤ effectiveTo` in promotional folders. Shows name, time remaining, and links to rule detail.
- **Upcoming:** Rules with `effectiveFrom > now` in promotional folders. Shows name and start date.
- **Recently Ended:** Rules with `effectiveTo < now` within the last 30 days. Shows name and how long ago it ended.
- **Promotion Calendar:** Link to a dedicated calendar view (`/programs/:id/promotions/calendar`) that renders all promotional rules on a timeline/calendar layout, color-coded by status (active/upcoming/ended).

**Data source:** Standard rle-api rule queries filtered by folder type and effective dates. No API changes needed.

If direct rle-api queries prove insufficient for promotion aggregation at scale, this is a candidate for `rcx-aux` (see §3.3 — Companion Service).

#### Member Stats Widget

Member statistics are sourced from **extension fields on the Program document** (`ext.stats.*`), populated by an external batch/ETL process:

| Stat | Extension Field | Description |
|------|----------------|-------------|
| Total Members | `ext.stats.totalMembers` | All-time member count for this program |
| Active (Quarter) | `ext.stats.activeMembersQuarter` | Members with ≥1 activity in last 90 days |
| Active (Month) | `ext.stats.activeMembersMonth` | Members with ≥1 activity in last 30 days |
| Active (Week) | `ext.stats.activeMembersWeek` | Members with ≥1 activity in last 7 days |
| Active (Day) | `ext.stats.activeMembersDay` | Members with ≥1 activity in last 24 hours |

The dashboard displays the stat matching the current time filter selection, with the full breakdown available on hover/expand. Percentage change indicators compare to the equivalent prior period.

#### Activity & Revenue Stats Widget

Revenue and activity volume stats follow the same extension pattern on the Program document:

| Stat | Extension Field | Description |
|------|----------------|-------------|
| Revenue (Quarter) | `ext.stats.revenueQuarter` | Sum of `activity.amount` over last 90 days |
| Revenue (Month) | `ext.stats.revenueMonth` | Sum of `activity.amount` over last 30 days |
| Revenue (Week) | `ext.stats.revenueWeek` | Sum of `activity.amount` over last 7 days |
| Revenue (Day) | `ext.stats.revenueDay` | Sum of `activity.amount` over last 24 hours |
| Activities (Quarter) | `ext.stats.activitiesQuarter` | Activity count over last 90 days |
| Activities (Month) | `ext.stats.activitiesMonth` | Activity count over last 30 days |
| Activities (Week) | `ext.stats.activitiesWeek` | Activity count over last 7 days |
| Activities (Day) | `ext.stats.activitiesDay` | Activity count over last 24 hours |

Sparkline charts show the daily breakdown over the selected period. Data for sparklines can come from a dedicated stats endpoint on the companion service (if introduced) or from a simple time-series query.

#### Rewards & Offers Stats Widget

The `RewardPolicy` model in rle-api is a polymorphic entity that serves three distinct business purposes, distinguished by `intendedUse`. The dashboard surfaces stats for each:

**1. Rewards Catalog (`intendedUse` not "Offer" or "Global Offer")**

Members spend points to acquire these rewards (stored in the `rewards` collection). The dashboard tracks inventory and popularity:

| Metric | Source | Description |
|--------|--------|-------------|
| Inventory alerts | `countLimit`, `availableRedemptions`, `redemptions` on RewardPolicy | Rewards approaching exhaustion (e.g., `availableRedemptions / countLimit < 10%`) |
| Soon to run out | Sorted by `availableRedemptions` ascending, filtered to active | Top N rewards closest to sell-out |
| Most popular | Sorted by `redemptions` descending | Highest-redeemed rewards in the period |
| Least popular | Sorted by `redemptions` ascending, filtered to `redemptions > 0` | Active rewards with lowest uptake |

```
┌──────────────────────────────────────────────────────────┐
│  🎁 Rewards Catalog                                      │
│                                                          │
│  RUNNING LOW                                             │
│  ⚠ Free Coffee        12 / 500 remaining                │
│  ⚠ Concert Tickets     3 / 100 remaining                │
│                                                          │
│  MOST POPULAR (Month)         LEAST POPULAR (Month)      │
│  1. Free Coffee    (243)      1. Tote Bag        (2)     │
│  2. $5 Off Coupon  (189)      2. Pen Set         (4)     │
│  3. Movie Ticket   (156)      3. Keychain        (7)     │
│                                                          │
│  [View Full Catalog ▸]                                   │
└──────────────────────────────────────────────────────────┘
```

**2. Benefits / Offers (`intendedUse` = "Offer")**

Tier-driven benefits placed into a member's offer wallet (`offers` collection). Typically issued automatically when a member qualifies for a tier. The dashboard shows:

| Metric | Source | Description |
|--------|--------|-------------|
| Active benefits | Count of RewardPolicies where `intendedUse = "Offer"` and within effective dates | How many benefit types are currently available |
| Issuance stats | `redemptions` on each benefit policy | How many members have received each benefit in the period |
| Budget utilization | `budgetUsed` / `budget` | Spend against allocated budget per benefit |

**3. Member Discounts (`intendedUse` = "Global Offer")**

Discount offers using the product/pricing fields (`discountType`, `price`, `maxDiscountValue`, `pricingType`, product constraints, `availability` schedule). These are metered and quantity-limited like catalog rewards. The dashboard shows:

| Metric | Source | Description |
|--------|--------|-------------|
| Active discounts | Count of active Global Offer policies | Currently available discount offers |
| Redemption rate | `redemptions` / `countLimit` | Utilization percentage per discount |
| Top discounts | Sorted by `redemptions` descending | Most-used discount offers in the period |
| Revenue impact | Requires `rcx-aux` or extension stats | Estimated discount value distributed (sum of `price` × `redemptions` or similar) |

**Data source:** Most metrics can be queried directly from rle-api (`GET /api/RewardPolicy` with appropriate filters and sorting). Aggregated stats (revenue impact, period-over-period trends) are candidates for `rcx-aux` pre-computation or program extension fields (`ext.stats.rewardRedemptions`, `ext.stats.discountRedemptions`, etc.) populated by the same external batch process as member/revenue stats.

#### Dashboard Time Filter

A single time-period selector controls which stats are displayed across all dashboard widgets:

- **Options:** Day, Week, Month, Quarter
- **Default:** Month
- **Persistence (two-tier):**
  1. **Immediate:** Stored in `localStorage` under `rcx.dashboard.timeFilter` for instant recall
  2. **Roaming:** Persisted to the **user's extension fields** (`ext.preferences.dashboardTimeFilter`) via `PATCH /api/User/:id` so the preference follows the user across devices/browsers
- On load, the dashboard reads from the user extension field first, falling back to localStorage, falling back to the default (Month)

#### Quick Actions

Contextual shortcuts for frequent operations. Each action navigates to the appropriate create form pre-scoped to the current program:

- **New Promotion** → Create rule in a promotional folder
- **New Streak** → Create streak policy
- **New Reward** → Create in Rewards Catalog (RewardPolicy, default intendedUse)
- **New Benefit** → Create in Benefits Catalog (RewardPolicy, intendedUse = "Offer")
- **New Discount** → Create in Discounts (RewardPolicy, intendedUse = "Global Offer")
- **Submit Activity** → Activity submission form
- **Add Member** → Member create form
- **Import Program** → Program import flow

Actions are gated by `<PermissionGate>` — only actions the user has permission for are displayed.

#### Favorite/Pinned Items
- User-configurable pinned pages stored in user extension fields (`ext.preferences.pinnedPages`)
- Displayed as a compact row of chips below quick actions (if any are pinned)

### 5.3 Members

#### Member List Page
```
┌─────────────────────────────────────────────────────────────┐
│  Members                                    [+ Add Member]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔍 Search members...          [Filters ▾] [Export]  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Name          │ Email       │ Tier    │ Points │ ... │   │
│  │───────────────│─────────────│─────────│────────│─────│   │
│  │ Jane Smith    │ j@mail.com  │ Gold    │ 12,450 │     │   │
│  │ John Doe      │ jd@co.com   │ Silver  │  3,200 │     │   │
│  └──────────────────────────────────────────────────────┘   │
│  Showing 1-25 of 12,345          [◀ 1 2 3 ... 494 ▶]       │
└─────────────────────────────────────────────────────────────┘
```

**Improvements over current:**
- **Unified search bar** — search across first name, last name, email, phone, loyalty ID simultaneously (server-side)
- **Filterable columns** — inline column filters with type-appropriate controls
- **Bulk actions** — select multiple members for bulk operations
- **Quick preview** — hover or click row to see member summary without navigating away
- **Column customization** — users can show/hide/reorder columns
- **Export** — CSV/Excel export of current view

#### Member Detail Page
Replace the current tab-heavy view with a more modern layout:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Members / Jane Smith                      [⋯] [Edit]    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  👤 Jane Smith           Tier: Gold ⬤                 │  │
│  │  jane.smith@email.com    Points: 12,450               │  │
│  │  +1 (555) 123-4567      Member since: Jan 2023       │  │
│  │  LID: ABC-123-XYZ       Status: Active               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [Activities] [Points] [Rewards] [Tiers] [More ▾]          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  (Tab content here — Activities table by default)     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Improvements:**
- **Summary card** at top — key info always visible regardless of active tab
- **Smart tab grouping** — Primary tabs visible, overflow in "More" dropdown
  - Primary: Activities, Points (Purses), Rewards, Tiers
  - Secondary (in More): Badges, Loyalty IDs, Referrals, Offers, Segments, Streaks, Preferences, Notes, Histories, Aggregates, T&C
- **Inline editing** — edit member fields directly in the summary card
- **Activity submission** — "Submit Activity" action button in the detail header
- **Timeline view** option for activity history
- **Member merge/unmerge** — accessible from the detail header actions menu (⋯), with visual preview of what will be combined
- **Account linking** — view/manage linked accounts via the `Account` model (array of `{member, program}` pairs). Shows all members linked to this account across programs, with their active/inactive status. Actions: link member, unlink member, set active member.
- **Referral tracking** — see referral chain and credit status (via `Referral` model — referrer, referred member, status, completion date, events)
- **Loyalty ID management** — assign/unassign loyalty cards and IDs inline (via `LoyaltyID` model — loyaltyId, status, primary flag, accrueTo routing)
- **Loyalty Cards** — view/manage physical card assignments (via `LoyaltyCard` model — cardType, loyaltyType, status, channel). Distinct from Loyalty IDs — cards represent physical/digital card issuance while IDs are the logical identifiers.
- **Member Notes** — timestamped notes/comments on a member for CRM and care operations (via `Note` model — note text, memberId, org). Displayed as a chronological feed in the Notes tab.

### 5.4 Programs

#### Program List
- Card-based layout showing program name, status (published/draft), rule count, last modified
- Click card → program detail

#### Program Detail (Hub Page)
A new hub page per program replacing the current direct jump to policies:

```
┌──────────────────────────────────────────────────────────┐
│  ← Programs / Acme Rewards                    [Edit] [⋯] │
│                                                          │
│  Status: Published ✓     Rules: 24    Last Activity: 2m  │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  📋 Rules    │  │  🔗 Flow    │  │  📊 Policies│      │
│  │  24 rules   │  │  Published  │  │  8 policies │      │
│  │  3 folders  │  │  View ▸     │  │  Manage ▸   │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                          │
│  Recent Rule Changes                                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  • "Double Points Weekend" updated 2h ago          │  │
│  │  • "Gold Tier Bonus" created yesterday             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

#### Policies
Replace the current tabbed view with a unified policies page per program:

- **Card grid or grouped list** showing all policy types
- Click a policy type → list of policies of that type
- Click a specific policy → detail/edit view
- Policy types: **Rewards Catalog**, **Benefits Catalog**, **Discounts**, Purse, Tier, Partner, Promo, Promo Code Def, Streak (with Goals), Aggregate

#### RewardPolicy → Three Distinct Views

The legacy UI presents all `RewardPolicy` records in a single generic list. The new UI **splits them into three purpose-specific views** based on `intendedUse`, each with a tailored form and presentation:

**1. Rewards Catalog** (`intendedUse` ≠ "Offer" and ≠ "Global Offer")

Members spend points to acquire these items. This is the "loyalty store."

- **List view:** Name, UPC, price (points cost), inventory (`availableRedemptions` / `countLimit`), effective dates, status
- **Create/Edit form:** Core fields: name, description, UPC, program, effective/expiration dates, `numUses`, `countLimit`, budget, priority, segments, availability schedule
- **Discount section (progressive disclosure):** A reward *optionally* has a discount attached (turning it into a coupon). The discount fields (`discountType`, `price`, `maxDiscountValue`, `pricingType`, product constraints, `mandatoryProducts`, `primaryProducts`, etc.) are **hidden by default** behind an "Add discount" toggle. Only revealed when the user explicitly opts in. This keeps the common case (a simple reward) clean.
- **Inventory tracking:** Visual indicator of `availableRedemptions` remaining, warning state when low

**2. Benefits Catalog** (`intendedUse` = "Offer")

Tier-driven benefits placed into a member's offer wallet. Typically issued automatically by rules when a member qualifies.

- **List view:** Name, description, associated tier levels (`tierPolicyLevels`), budget utilization, issuance count, effective dates
- **Create/Edit form:** Tailored to benefits — name, description, tier associations, effective/expiration dates, budget, `perDayLimit`, `perWeekLimit`, `perOfferLimit`, segments
- **Discount fields:** Same progressive disclosure as Rewards Catalog — benefits *can* carry discounts but usually don't
- **No inventory tracking** — benefits are typically unlimited issuance (no `countLimit`)

**3. Discounts** (`intendedUse` = "Global Offer")

Discount offers surfaced to members. These heavily use the product/pricing machinery.

- **List view:** Name, discount type, value, redemption count / limit, locations, effective dates, status
- **Create/Edit form:** Discount fields are **primary** (not hidden) — `discountType`, `price`, `maxDiscountValue`, `pricingType`, product tiers (mandatory/primary/secondary/tertiary/excluded), `minPurchaseAmount`, locations, availability schedule, `upcMapping`
- **Inventory & metering:** `countLimit`, `availableRedemptions`, `transactionLimit`, `coolOffPeriod` prominently displayed
- **Product constraints:** Multi-tier product selection UI for mandatory/primary/secondary/tertiary/excluded products with quantity and per-tier discount values

**Implementation notes:**
- All three views hit the same `GET /api/RewardPolicy` endpoint, filtered by `intendedUse`
- Creates/updates use the same `POST/PATCH /api/RewardPolicy` endpoint, with `intendedUse` set automatically based on which view the user is in
- `intendedUse` is immutable on the model — once created, a reward policy's type cannot change
- The Zod validation schemas differ per view, enforcing only the fields relevant to that type
- Permission gating uses the existing `RewardPolicy` ACL entity — no API-side permission changes needed

#### Rule Builder (Major Redesign)

This is the most complex feature. The current 1,650-line monolithic controller needs to become a well-structured, multi-panel editor.

**New Rule Builder Layout:**
```
┌──────────────────────────────────────────────────────────────┐
│  ← Rules / Double Points Weekend           [Save] [Delete]   │
│                                                              │
│  ┌──────────────────┬───────────────────────────────────┐    │
│  │  RULE CONFIG      │  PREVIEW                         │    │
│  │                   │                                   │    │
│  │  Name: ________   │  When:                            │    │
│  │  Effective:       │    member.tier == "Gold"           │    │
│  │  [date] → [date]  │    AND activity.type == "purchase" │    │
│  │  Status: Active   │                                   │    │
│  │  Budget: $10,000  │  Then:                            │    │
│  │  Count Limit: 500 │    addPoints(amount * 2, "bonus") │    │
│  │                   │    issueReward("free-coffee")      │    │
│  │  ── Conditions ── │                                   │    │
│  │  [Condition       │  ── Summary ──                    │    │
│  │   Builder]        │  Budget used: $2,340 / $10,000    │    │
│  │                   │  Times fired: 127 / 500           │    │
│  │  ── Actions ──    │                                   │    │
│  │  [Action          │                                   │    │
│  │   Builder]        │                                   │    │
│  └──────────────────┴───────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Key improvements:**
- **Two-panel layout** — config on left, live preview on right
- **Condition builder** — visual condition tree with drag-to-reorder, AND/OR grouping
- **Expression editor** — Monaco-based with IntelliSense for member fields, activity fields, and user-defined expressions
- **Custom Expressions library** — managed via the `CustomExpression` model. Users can save, name, and reuse expressions (with alias, type, path, version). Expressions can be private (per-user) or shared (per-program). The expression editor's IntelliSense autocomplete draws from this library alongside built-in field paths.
- **Action builder** — card-based action list with type-specific forms
- **Live validation** — conditions validate as you type
- **Rule testing** — "Test Rule" button to dry-run against a sample member/activity. Test data managed via the `CustomData` model (user-scoped test fixtures with name, type, program, member references). Users can save and reuse test scenarios.
- **Rule execution history** — after a rule is live, view its execution stats via the `RuleMatch` model (per-activity match results showing which rules fired, match counts, product line allocations, and execution counts). Accessible from the rule detail page as a "History" or "Execution Log" tab.

#### Flow Composer (Major Redesign)

Replace JointJS with **React Flow** for a dramatically improved experience:

```
┌──────────────────────────────────────────────────────────────┐
│  ← Programs / Acme Rewards / Flow     [Validate] [Publish]   │
│                                                              │
│  ┌──────────┬───────────────────────────────────────────┐    │
│  │ TOOLBOX  │                                           │    │
│  │          │    ┌──────────┐     ┌──────────┐          │    │
│  │ ▣ Start  │    │  Start   │────▸│ Check    │          │    │
│  │ ▣ Rule   │    │          │     │ Tier     │          │    │
│  │ ▣ Folder │    └──────────┘     └────┬─────┘          │    │
│  │ ▣ End    │                      ┌───┴────┐           │    │
│  │          │                 ┌────┤        ├────┐      │    │
│  │          │                 │    └────────┘    │      │    │
│  │          │            ┌────┴───┐         ┌───┴────┐  │    │
│  │          │            │ Gold   │         │ Silver │  │    │
│  │          │            │ Rules  │         │ Rules  │  │    │
│  │          │            └────┬───┘         └───┬────┘  │    │
│  │          │                 └──────┬──────────┘       │    │
│  │          │                   ┌────┴───┐              │    │
│  │          │                   │  End   │              │    │
│  │          │                   └────────┘              │    │
│  └──────────┴───────────────────────────────────────────┘    │
│  [Zoom: 100%] [Fit] [Undo] [Redo]                           │
└──────────────────────────────────────────────────────────────┘
```

**Key improvements:**
- **Drag-and-drop from toolbox** — drag rule blocks onto the canvas
- **Minimap** — overview of large flows
- **Undo/Redo** — full history stack
- **Auto-layout** — automatic graph layout algorithm
- **Node inspector** — click a node to see/edit its rules inline
- **Validation overlay** — visual indicators on invalid connections
- **Publish diff** — show what changed since last publish

### 5.5 Reference Data

All reference data pages (Segments, Locations, Products, Enums, Named Lists, Loyalty Cards) use the **ServerTable framework** (§12.1). Each entity requires only a small config file and a thin page component — the framework handles table rendering, server-side pagination/sorting/filtering, form drawers, bulk operations, column chooser, and user preference persistence.

**Canonical example:** `src/features/reference-data/locations/` — a config file (`config/location-config.ts`) and a page (`pages/locations-page.tsx`) that composes `ServerTablePage` with the config.

**What each entity page gets automatically:**
- Server-side paginated table with sort, per-column filters, and global search
- Column chooser with drag-reorder, persisted to user preferences
- Create/edit form drawer with tabs (core fields + extension field tabs)
- Bulk select (checkbox, Shift+click range, Ctrl+click, select-all across pages)
- Bulk edit drawer and bulk delete with confirmation
- Extension fields rendered dynamically from runtime schema
- Skeleton loading states and empty state messaging

**Entity-specific notes:**
- **Named Lists** — `NamedList` defines query/filter criteria; resolved rows live in `NamedListData`. The UI should show both the list definition and a preview of resolved data, with manual refresh capability.
- **Loyalty Cards** — card type definitions listed under Reference Data; per-member card assignments visible on the Member Detail page.

### 5.6 Analytics

Replace the current basic chart pages with an interactive analytics dashboard:

```
┌──────────────────────────────────────────────────────────┐
│  Analytics                         [Date Range ▾]        │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │  Members by Tier    │  │  Purse Balances     │       │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │       │
│  │  │  [Bar Chart]  │  │  │  │  [Pie Chart]  │  │       │
│  │  └───────────────┘  │  │  └───────────────┘  │       │
│  └─────────────────────┘  └─────────────────────┘       │
│                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │  Top Products       │  │  Promotion Metrics  │       │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │       │
│  │  │  [Table]      │  │  │  │  [Line Chart] │  │       │
│  │  └───────────────┘  │  │  └───────────────┘  │       │
│  └─────────────────────┘  └─────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

**Improvements:**
- **Dashboard layout** — configurable grid of analytics widgets
- **Interactive charts** — hover for details, click to drill down
- **Date range picker** — global date range filter
- **Drill-down** — click a chart segment to see underlying data
- **Comparison mode** — compare two time periods side-by-side

### 5.7 AI-Assisted Rule Authoring (NEW — Leverages Existing API)

The rle-api already has an AI assistant module (`lm-assist`) with streaming endpoints. The new UI should surface this prominently:

- **Expression Suggestions:** When editing rule conditions/actions, an AI copilot can suggest expressions based on context
- **Natural Language → Expression:** User describes intent in plain English, AI generates the rule expression
- **Expression Explanation:** Select an expression, ask "what does this do?" and get a plain-English explanation
- **Endpoint:** `POST /api/ai-assistant/stream` (Server-Sent Events for streaming responses)
- **UI Integration:** Inline in the Rule Builder as a collapsible assistant panel

### 5.8 Program Import/Export

The API supports full program import/export including selective import. The new UI should make this accessible:

- **Export:** From program detail page, export program with all dependencies (rules, flows, policies)
- **Selective Export:** Choose which components to include
- **Import:** Upload exported program JSON to a target org
- **Selective Import:** Pick components from an import bundle
- **Dependency Checksums:** Visual diff showing what will change on import

### 5.9 Promo Code Management

Promo codes have a rich lifecycle that the current UI handles across multiple views. Consolidate into a dedicated experience:

- **Campaign Management:** Create promo code definitions (campaigns) with generation rules
- **Code Generation:** Bulk generate codes for a campaign
- **Code Assignment:** Assign codes to specific members
- **Code Redemption:** Redeem codes for members
- **Export:** Export generated codes (CSV)
- **Tracking:** View assignment and redemption status

### 5.10 Settings

#### User Management
- User list with role badges
- Invite user flow
- Role assignment with permission preview

#### ACL/Security Setup
- Visual permission matrix — entity types vs. role permissions
- Role builder with drag-and-drop permission assignment
- Preview: "What can this role see?"

#### Extensions
- Schema builder with visual field editor (backed by `ExtensionDef` and `ExtensionSchema` models)
- `ExtensionDef` — registry of which models have extensions enabled, per org
- `ExtensionSchema` — the actual schema definition (JSON schema), UI rendering hints (`uiDef`), enum paths, and categorized field groupings
- Preview of how extension fields render on entities
- Schema versioning awareness

### 5.11 Async Job Tracking

The `Job` model tracks async operations (bulk imports, program publish, promo code generation, etc.). The new UI surfaces these through the notifications bell in the global header:

- **Job list panel** — slide-out from the notifications bell showing recent jobs: name, status (pending/running/completed/failed), submit time, completion time
- **Job detail** — click a job to see params, result, and error details
- **Polling** — job status refreshed via TanStack Query polling (5–10s interval while panel is open)
- **Toast notifications** — when a job completes or fails while the user is active, show a toast with the outcome
- **No separate page needed** — the job panel in the header is sufficient for this admin-level feature

### 5.12 Streak Goals (Detail)

Streaks (`StreakPolicy`) contain embedded **Goal Policies** (`GoalPolicy`) that define sub-objectives within a streak:

- **Goal list** — within a streak policy's edit view, goals are displayed as an ordered list of cards
- **Goal fields:** name, description, target (required numeric threshold), time limit (value + unit + snap-to), cool-off time
- **Goal rules:** Each goal can reference up to 3 rules — accumulation rule (`accRule`), bonus rule (`bonusRule`), expiration penalty rule (`expirationPenaltyRule`)
- **Goal progress** — on the member's streak detail, show progress toward each goal (current value vs. target)
- **Streak rule types:** The parent streak policy references up to 7 specialized rules: opt-in, accumulation, evaluation, bonus, progress, expiration penalty, opt-out. These are regular Rule records but scoped to the streak via `streakPolicyId` and `streakRuleType` on the Rule model.
- **Streak event log** — `StreakEventLog` model captures lifecycle events (opt-in, goal completion, bonus awarded, expiration, etc.). Available as a read-only log in the streak detail view for debugging.

---

## 6. Shared Component Library

The shared component library has been built out. This section documents what exists and where to find canonical examples.

### 6.1 Tables

Two table systems coexist for different use cases:

| System | Location | Use Case |
|--------|----------|----------|
| **ServerTable** | `src/shared/components/server-table.tsx` | Server-side paginated tables with sort, column filters, selection, cell renderers |
| **DataTable** | `src/shared/components/data-table/` | Client-side TanStack Table with virtual scrolling (for member detail tabs, embedded lists) |

**ServerTable** is the primary table for all list pages. See §12.1 for the full framework.

**Supporting components:**
- `TablePagination` (`src/shared/components/table-pagination.tsx`) — page size selector, prev/next, page number display
- `ColumnChooserDropdown` (`src/shared/components/column-chooser-dropdown.tsx`) — portal-rendered panel for show/hide/reorder columns
- `BulkActionBar` (`src/shared/components/bulk-action-bar.tsx`) — floating bar for bulk edit/delete when rows are selected

### 6.2 Forms & Dialogs

| Component | Location | Purpose |
|-----------|----------|---------|
| **EntityEditPage** | `src/shared/components/entity-edit-page.tsx` | Config-driven multi-tab edit page (§12.2) |
| **FormModal** | `src/shared/components/form-modal.tsx` | Modal for quick create operations |
| **DrawerShell** | `src/shared/components/drawer-shell.tsx` | Slide-in drawer wrapper with header, close, and body |
| **FieldRenderer** | `src/shared/components/field-renderer.tsx` | Renders form fields by type (text, number, date, enum, boolean, textarea, multi-select) |
| **CoreFieldRenderer** | `src/shared/components/core-field-renderer.tsx` | Renders core fields using RHF Controller binding |
| **ExtFieldRenderer** | `src/shared/components/ext-field-renderer.tsx` | Renders extension fields dynamically from schema |
| **BulkField** | `src/shared/components/bulk-field.tsx` | Opt-in checkbox + field for bulk edit drawers |

**Dialog components (never duplicate inline — always import from `src/shared/components/`):**
- `UnsavedChangesDialog` — "you have unsaved changes" prompt
- `DeleteConfirmDialog` — entity deletion confirmation
- `ConfirmDialog` — generic confirm/cancel dialog

### 6.3 Navigation & Layout

| Component | Location | Purpose |
|-----------|----------|---------|
| **Sidebar** | `src/shared/components/sidebar.tsx` | Collapsible nav with program selector, expandable groups |
| **PageHeader** | `src/shared/components/page-header.tsx` | Standardized page title with optional icon |
| **BreadcrumbContext** | `src/shared/components/breadcrumb-context.tsx` | Dynamic breadcrumbs via context provider |
| **SearchBar** | `src/shared/components/search-bar.tsx` | Debounced search input |
| **NoProgramBanner** | `src/shared/components/no-program-banner.tsx` | Empty state when no program is selected |
| **PermissionGate** | `src/shared/components/permission-gate.tsx` | Hides/disables UI based on ACL permissions |

### 6.4 Select / ComboBox

`src/shared/components/select.tsx` and `src/shared/components/multi-select.tsx` — searchable dropdowns built on Radix UI. Used everywhere: forms, filters, toolbars.

**Key behaviors:** always searchable, keyboard navigable, grouped options support, `+N more` display for multi-select, mouse wheel scrolling fix for modal contexts.

### 6.5 Base UI Primitives

`src/shared/ui/` contains low-level components: `Button`, `Input`, `Badge`, `Card`, `Skeleton`, `Switch`, `Checkbox`. These are the building blocks used by all higher-level components. Style rules are documented in the `/ui-standards` skill.

---

## 7. Migration Strategy

### 7.1 Approach: Parallel Build with Incremental Cutover

We will NOT try to migrate the existing AngularJS code. Instead:

1. **Build the new UI from scratch** in `/rcx-ui/`
2. **Run both UIs in parallel** during transition — old UI at `/legacy/`, new UI at `/`
3. **Feature-flag based cutover** — individual features can be switched between old/new
4. **API compatibility is guaranteed** — same `/api/` endpoints

### 7.2 Phased Delivery

Status as of March 2026. Phases marked ✅ are complete, 🔧 are in progress, ⬚ are not started.

#### Phase 1: Foundation + Core ✅
- Project scaffolding (Vite 6, React 19, TypeScript 5 strict, Tailwind CSS 4)
- App shell (sidebar, header, routing, auth with OIDC, permission system)
- API client layer (Axios + TanStack Query + generic CRUD hooks)
- DataTable and ServerTable components
- FormModal, DrawerShell, FieldRenderer components
- EntityEditPage config-driven edit page pattern
- Select/MultiSelect with search
- User preference persistence via `ext._meta`
- i18n setup (en + ja)

#### Phase 2: Program Configuration 🔧
- ✅ Program list and detail pages
- ✅ Purse policies (EntityEditPage config pattern)
- ✅ Tier groups (EntityEditPage config pattern)
- ✅ Activity templates (custom edit page)
- ⬚ Partner policies
- ⬚ Promo policies, promo code definitions
- ⬚ Streak policies (with GoalPolicy)
- ⬚ Aggregate policies

#### Phase 3: Reward Catalog ✅
- ✅ Full CRUD with ServerTable (server-side pagination, sort, column filters)
- ✅ Custom form/bulk-edit drawers (React Hook Form + Zod)
- ✅ Card grid view + table view toggle
- ✅ Stats tiles, quick search, fullscreen mode
- ✅ Bulk select (Shift/Ctrl+click, select-all across pages), bulk edit, bulk delete
- ✅ Extension fields rendered dynamically from schema
- ✅ Column chooser with drag-reorder, user preference persistence
- ✅ E2E test coverage (29 tests)

#### Phase 4: Reference Data 🔧
- ✅ ServerTable framework extracted to `reference-data/shared/`
- ✅ Locations page (full CRUD + bulk ops + extension fields)
- ✅ Products page (full CRUD + bulk ops + extension fields)
- ⬚ Segments, Enums, Named Lists, Loyalty Cards (scaffolded, need config + page)
- ⬚ Bulk import/export (CSV)

#### Phase 5: Members ⬚
- Member list page with search, filter, pagination
- Member detail page with all tabs
- Member create/edit forms
- Activity submission

#### Phase 6: Rule Builder ⬚
- Rule list with folder hierarchy
- Rule builder (conditions, actions, expressions)
- Expression editor with IntelliSense + Custom Expressions library
- Rule testing, rule execution history

#### Phase 7: Flow Composer ⬚
- React Flow integration
- Node types (Start, Rule, RuleFolder, End)
- Flow validation and publish/unpublish

#### Phase 8: Analytics ⬚
- Analytics dashboard, chart views, date range filtering

#### Phase 9: Settings & Administration 🔧
- ✅ Page structure for all settings sections
- ⬚ User management CRUD
- ⬚ ACL/role management
- ⬚ Extensions, Limits, Divisions CRUD
- ⬚ Async Job tracking panel

#### Phase 10: Polish & Cutover ⬚
- E2E test suite expansion
- Performance optimization
- Accessibility audit (WCAG 2.1 AA)
- Dark mode
- Legacy UI deprecation plan

### 7.3 Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| API incompatibilities discovered late | Build typed API client first (Phase 1), validate against real API early |
| Rule builder complexity underestimated | Start Phase 5 research in Phase 3, prototype early |
| Flow composer React Flow limitations | Evaluate React Flow fitness in Phase 1 with a spike |
| ACL permission model gaps | Map all existing permissions in Phase 1, validate against left-menu.html |
| Extension field rendering edge cases | Catalog all extension schemas early, build test fixtures |

---

## 8. Data Model Entity Inventory

The `rcx-packages/model-defs` package contains **91 Mongoose models**. This section categorizes every model by its role in the new UI. Type definitions will be generated from the Mongoose schemas in Phase 1.

### 8.1 Primary Entities — Full UI Coverage Required

These models have dedicated views, forms, or tabs in the new UI.

| Model | API Endpoint | UI Location | Notes |
|-------|-------------|-------------|-------|
| **Member** | `/api/Member` | §5.3 Members | Core entity. Fields: firstName, lastName, email, cellPhone, enrollDate, enrollSource, enrollChannel, status, program, org, divisions, ext |
| **Program** | `/api/Program` | §5.4 Programs | enrollSettings, version, rules/streaks/flow refs, lastPublished, hasChanges |
| **Org** | `/api/Org` | §5.5 Reference Data | name, desc, dbUrl |
| **User** | `/api/User` | §5.10 Settings | login, email, roles, division, possibleDivisions, partner, oidcUser, session management |
| **Division** | `/api/Division` | §5.10 Settings | Hierarchical (parent self-ref), permissions per division, isActive |
| **Rule** | `/api/Rule` | §5.4 Rule Builder | conditions, actions, effectiveFrom/To, budget, countLimit, locations, products, availability schedule, streakPolicyId, streakRuleType |
| **RuleFolder** | `/api/RuleFolder` | §5.4 Rule Builder | Hierarchical (parentFolder self-ref), `isPromoFolder` flag (drives §5.2 Promotions), `isStreakFolder`, `isTrash`, flow flag |
| **Flow** | `/api/Flow` | §5.4 Flow Composer | graph (JSON), logic (JSON), primary flag, effectiveFrom/To |
| **RewardPolicy** | `/api/RewardPolicy` | §5.4 (3 views) | Split by `intendedUse`: Rewards Catalog / Benefits Catalog / Discounts. ~50 fields — see §5.4 for per-view field gating |
| **PursePolicy** | `/api/PursePolicy` | §5.4 Policies | Expiration (hours/snapTo/unit/value), escrow, colors, overdraftLimit, period-based, group, aggregates |
| **TierPolicy** | `/api/TierPolicy` | §5.4 Policies | levels (TierLevel[]), primary flag |
| **StreakPolicy** | `/api/StreakPolicy` | §5.4 Policies, §5.12 | goalPolicies (GoalPolicy[]), 7 rule refs (optin/acc/eval/bonus/progress/expirationPenalty/optout), timeLimit, instanceLimit |
| **GoalPolicy** | Embedded in StreakPolicy | §5.12 Goals | name, target, timeLimit, accRule, bonusRule, expirationPenaltyRule |
| **AggregatePolicy** | `/api/AggregatePolicy` | §5.4 Policies | aggregateTypes, effectiveDate/expirationDate |
| **Partner** | `/api/Partner` | §5.4 Policies | name, code, status, partnerType, timezone, isHostingPartner, optional program scoping |
| **Location** | `/api/Location` | §5.5 Reference Data | city, state, country, zipCode, timeZone, geoPoint (2dsphere), number |
| **Product** | `/api/Product` | §5.5 Reference Data | sku, upc, category, subcategory, style, cost, effectiveDate/expirationDate |
| **Segment** | `/api/Segment` | §5.5 Reference Data | name, type, description |
| **DMA** | `/api/DMA` | §5.5 Reference Data | name, zipCodes array |
| **Enum** | `/api/Enum` | §5.5 Reference Data | type, lang, value, valueType, label, displayType, context, enumType |
| **NamedList** | `/api/NamedList` | §5.5 Reference Data | modelType, type, query, inclusionParams, count, refreshDate, refreshedBy |
| **NamedListData** | `/api/NamedListData` | §5.5 Reference Data | Resolved data rows for a NamedList — displayed as preview within the Named List detail view |
| **LoyaltyCard** | `/api/LoyaltyCard` | §5.5 Reference Data, §5.3 Member Detail | cardType, loyaltyType, status, channel — card type definitions and per-member assignments |
| **PromoCodeDef** | `/api/PromoCodeDef` | §5.9 Promo Codes | campaignCode, type, codeLength, codeAlphabet, codeCap, startDate/endDate |
| **PromoCode** | `/api/PromoCode` | §5.9 Promo Codes | code, defId, memberId, status, redemptionDate, assignmentDate, expirationDate |
| **ExtensionDef** | `/api/ExtensionDef` | §5.10 Extensions | model, org, display — registry of which models have extensions |
| **ExtensionSchema** | `/api/ExtensionSchema` | §5.10 Extensions | model, extSchema (JSON), uiDef (JSON), enumPath, categories |
| **Limit** | `/api/Limit` | §5.10 Settings | principalType (User/Role), principalId, limitSpec |
| **CustomExpression** | `/api/CustomExpression` | §5.4 Rule Builder | name, expr, alias, type, path, version, user, program, isDefault — saved UDFs for expression editor |
| **CustomData** | `/api/CustomData` | §5.4 Rule Builder | name, type, data, user, program, member — test fixtures for rule testing |
| **Job** | `/api/Job` | §5.11 Job Tracking | name, status, params, submitTime, result, error, completionTime |

### 8.2 Member Sub-Collections — Displayed in Member Detail Tabs

These models represent data attached to a member, displayed as tabs/sections in the Member Detail page (§5.3).

| Model | Tab/Section | Key Fields |
|-------|------------|------------|
| **Activity** / **ActivityHistory** | Activities | type, date, value, location, lineItems, tenderItems, status, result, ruleMatch |
| **Reward** | Rewards | name, code, usesLeft, expiresOn, policyId, rule, isCancelled, lockDetails |
| **Offer** | Offers | name, code, usesLeft, timesUsed, isGlobal, discount, policyId, singleUse, lockDetails |
| **Purse** | Points | (defined in defs/purse.js) — balances, escrow, expiration |
| **Tier** | Tiers | name, level (TierLevel), achievedOn, requalsOn, policyId, lockDate, lockedBy, reason |
| **Badge** | Badges | name, achievedOn |
| **Streak** / **Goal** | Streaks | (defined in defs/streak.js, defs/goal.js) — progress, status, goals |
| **LoyaltyID** | Loyalty IDs | loyaltyId, status, primary, accrueTo (member routing) |
| **MemberSegment** | Segments | segment ref, isCancelled |
| **Preference** / **MemberPreference** | Preferences | name, value, type, inferred, category, expirationDate |
| **Note** | Notes | note (text), memberId — chronological care notes |
| **Referral** | Referrals | code, status, referrer, referredMemberId, completionDate, events |
| **Account** | Account Linking | members [{member, program}], activeMember |
| **TierHistory** | Histories | tier, date, newTierLevel, oldTierLevel, reason, lockedBy |
| **PurseHistory** | Histories | purse data snapshot + memberId |
| **StreakHistory** | Histories | streak data snapshot + memberId |
| **MergeHistory** | Merge Histories | survivorId, victimId, mergeStatus, unMergeStatus, dates |
| **OfferUsageHistory** | (within Offers) | Usage tracking for offer redemptions |
| **RewardUsageHistory** | (within Rewards) | Usage tracking for reward redemptions |

### 8.3 Time-Series Aggregates — Member Detail Aggregates Tab

7 models for pre-computed member statistics at different granularities. All share a common schema (from `defs/aggregate.js`) plus a period identifier.

| Model | Period |
|-------|--------|
| **DailyAggregate** | day |
| **WeeklyAggregate** | week |
| **MonthlyAggregate** | month |
| **QuarterlyAggregate** | quarter |
| **HalfYearlyAggregate** | half-year |
| **YearlyAggregate** | year |
| **LifetimeAggregate** | lifetime |

### 8.4 Rule Support Models — Used Within Rule Builder / Flow

| Model | Purpose | Notes |
|-------|---------|-------|
| **Condition** | Rule condition expression | name, desc, logicJSON (string) — embedded in Rule |
| **Action** | Rule action expression | name, desc, logicJSON (string) — embedded in Rule |
| **RuleMatch** | Per-activity rule execution results | ruleId, matchCount, product line allocations, ruleFired, executionCount — viewable in rule detail history |
| **RuleLimit** | Rule metering state | Tracks per-rule count/budget consumption |
| **TierLevel** | Tier level definition | Embedded in TierPolicy — level name, thresholds |

### 8.5 Program Internal Models — Not Directly Surfaced

These are internal data containers used by the API for program versioning and publish operations. The UI interacts with them indirectly through Program operations.

| Model | Purpose |
|-------|---------|
| **ProgramRulesData** | Versioned snapshot of program rules |
| **ProgramStreaksData** | Versioned snapshot of program streaks |
| **ProgramFlowData** | Versioned snapshot of program flow |
| **ProgramPublishStatus** | Tracks publish operations and their outcomes |

### 8.6 Supporting / Embedded Models — No Direct UI

These models are embedded within other entities or serve as infrastructure. The UI does not need dedicated views for them but must handle them when they appear in parent entities.

| Model | Purpose | Embedded In |
|-------|---------|-------------|
| **LineItem** | Activity line item | Activity.lineItems |
| **TenderItem** | Activity tender/payment | Activity.tenderItems |
| **LockDetail** | Reward/offer lock state | Reward.lockDetails, Offer.lockDetails |
| **PurseEscrow** | Escrowed point balance | Purse sub-collection |
| **Accrual (AccrualItem)** | Point accrual record | Derived from activities |
| **LocationOverride** | Per-location overrides | Location sub-document |
| **AssociatedData** | Associated data records | Support structure |
| **FieldProperty** | Extension field metadata | ExtensionSchema internals |
| **FileProperty** | Extension file metadata | ExtensionSchema internals |
| **Counter** | Auto-increment sequences | Internal utility (promo code generation, etc.) |
| **VersionInfo** | Model version tracking | Internal versioning |
| **StreakEventLog** | Streak lifecycle events | Viewable as read-only log in §5.12 |
| **MetricEventLog** | Metrics/monitoring events | Internal observability |

### 8.7 MCP UI Config — Out of Scope (see §10)

| Model | Purpose |
|-------|---------|
| **MCPUIConfig** | Draft UI configuration |
| **MCPUIPublishedConfig** | Published UI configuration |
| **MCPUIDeployedConfig** | Deployed UI configuration |

Branding/white-labeling via MCP UI Config is excluded from the current effort (§10 decision #1).

### 8.8 Integration Framework — Out of Scope (see §10)

| Model | Purpose |
|-------|---------|
| **Integration** | Partner integration definitions (status, scheduling, alerts, dependencies, execution) |
| **IntegrationTemplate** | Reusable integration templates |
| **Connection** | Base connection model |
| **SFTPConnection** | SFTP connection credentials/config |
| **S3Connection** | S3 connection credentials/config |
| **ErrorCodeMap** | Error code mapping for integrations |

These 6 models form a partner ETL/integration framework that is a separate concern (§10 decision #8). They will be addressed in a future phase or separate project.

### 8.9 Entity Count Summary

| Category | Models | Status |
|----------|--------|--------|
| Primary entities (full UI) | 31 | In scope |
| Member sub-collections | 20 | In scope (member detail tabs) |
| Time-series aggregates | 7 | In scope (member detail) |
| Rule support | 5 | In scope (rule builder internals) |
| Program internals | 4 | In scope (indirect, via program operations) |
| Supporting / embedded | 13 | In scope (handled within parent entities) |
| MCP UI Config | 3 | Out of scope (§10 #1) |
| Integration framework | 6 | Out of scope (§10 #8) |
| **Total** | **89** | **80 in scope, 9 out of scope** |

Full TypeScript type definitions will be generated from the Mongoose model schemas in Phase 1.

---

## 9. Non-Functional Requirements

### Performance
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s
- **Largest Contentful Paint:** < 2.5s
- **Data table render:** < 500ms for 1000 rows (virtual scrolling)
- **Route transitions:** < 200ms perceived (prefetching + optimistic UI)
- **Bundle size:** < 300KB initial JS (gzipped), code-split by route

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigable throughout
- Screen reader support via Radix UI primitives
- Focus management on route changes and modal opens
- Color contrast ratios ≥ 4.5:1

### Browser Support
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- No IE support (unlike current AngularJS app)

### Security
- Same JWT/OIDC auth as current
- CSP headers
- No inline styles/scripts in production
- Dependency audit in CI pipeline
- Permission checks both client-side (UX) and server-side (enforced by rle-api)

### Testing

#### Unit Testing
- **Framework:** Vitest + React Testing Library
- **Coverage target:** All shared components, hooks, utilities, and non-trivial business logic
- **Test co-location:** Test files live alongside source files (`Component.test.tsx` next to `Component.tsx`)
- **CI integration:** Unit tests run on every commit and must pass before merge

#### E2E Testing
- **Framework:** Playwright
- **Scope:** Critical user flows — login, member CRUD, rule creation, flow editing, policy management, navigation
- **Test isolation:** Each test uses API-seeded data and cleans up after itself

#### `data-testid` Convention (Mandatory)
All interactive and semantically meaningful elements **must** include a `data-testid` attribute. This provides stable selectors for Playwright and avoids brittle tests that rely on CSS classes, DOM structure, or text content that can change with design or i18n updates.

**Naming convention:** `{feature}-{element}-{qualifier}`

Examples:
```
data-testid="member-list-search-input"
data-testid="member-list-row-{id}"
data-testid="member-detail-edit-button"
data-testid="rule-builder-condition-add"
data-testid="rule-builder-action-card-{index}"
data-testid="flow-composer-node-{nodeId}"
data-testid="nav-sidebar-members"
data-testid="command-palette-input"
data-testid="program-policy-tab-rewards"
```

**Rules:**
- Every button, link, input, form, table row, tab, modal, and dropdown trigger gets a `data-testid`
- Dynamic elements include their ID or index in the testid (e.g., `member-list-row-{id}`)
- `data-testid` values are treated as a stable contract — changing them is a breaking change that requires updating corresponding Playwright tests
- Shared components (`DataTable`, `FormModal`, `SearchBar`, etc.) accept an optional `testIdPrefix` prop so that the same component produces unique testids in different contexts
- A lint rule or code review check should enforce `data-testid` presence on interactive elements

#### Playwright Best Practices
- **Prefer `data-testid` selectors** over `getByRole`, `getByText`, or CSS selectors for all test locators
- **Page Object Model:** Each major page/feature has a corresponding page object class that encapsulates its `data-testid` selectors and common interactions
- **No hardcoded waits** — use Playwright's built-in auto-waiting and `data-testid`-based locators
- **Cross-browser:** Tests run against Chromium, Firefox, and WebKit in CI

---

## 10. Resolved Design Decisions

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | **Branding/White-labeling** | **Not in scope** | MCP UI Config is out of scope for this effort |
| 2 | **Offline support** | **No** | Admin tool requires connectivity; no existing offline patterns |
| 3 | **Real-time updates** | **Polling only** | Simple periodic refresh (30-60s) via TanStack Query `refetchInterval`. SSE only for existing AI assistant endpoint. No WebSockets, no API changes needed. |
| 4 | **Mobile support** | **Responsive tablet+ (768px+)** | Optimized for desktop, functional on iPad/tablet. No phone optimization — appropriate for an admin tool. |
| 5 | **Starting point** | **Start fresh in `rcx-ui/`** | Ignore all existing frontend prototypes. Clean architecture designed for the full scope. |
| 6 | **Localization** | **Expandable + full RTL support** | Ship with EN + JA (~1,400 keys each). Architecture must support adding new LTR and RTL languages without code changes. |
| 7 | **API versioning** | **Target v1 exclusively** | No v2 exists or is planned. All endpoints are `/api/`. |
| 8 | **Integration framework** | **Not in scope** | The `Integration`, `IntegrationTemplate`, `Connection` (SFTP/S3), and `ErrorCodeMap` models (8 models total) form a partner integration/ETL framework. This is a separate concern with its own UI requirements and will be addressed in a future phase or separate project. |

### Localization Architecture (Detail)

Given the RTL requirement, the i18n setup needs specific attention:

- **Library:** `react-i18next` with `i18next-http-backend` for lazy loading
- **Translation format:** JSON namespace files per feature (`members.json`, `programs.json`, etc.)
- **RTL support:**
  - Tailwind CSS `rtl:` variant for directional styles
  - `dir` attribute on `<html>` toggled by language
  - Logical CSS properties (`margin-inline-start` vs `margin-left`) preferred throughout
  - All icons with directional meaning (arrows, chevrons) flip in RTL mode
- **Key extraction:** Automated via `i18next-parser` during build
- **Current languages:** `en` (default), `ja`
- **Adding a language:** Drop a new JSON file per namespace + add locale to config — no code changes needed

### Responsive Design Strategy (Detail)

Targeting 768px+ with desktop optimization:

- **Breakpoints:** `md` (768px) for tablet, `lg` (1024px) for desktop, `xl` (1280px) for wide desktop
- **Sidebar:** Collapses to overlay drawer below `lg`, always visible on desktop
- **DataTables:** Horizontal scroll on tablet, full view on desktop
- **Forms:** Stack to single column on tablet, multi-column on desktop
- **Flow Composer:** Desktop only (1024px+) — show "use desktop" message on smaller screens
- **No phone (< 768px) optimization** — not a priority for admin tooling

---

## 11. Success Metrics

| Metric | Current (Estimated) | Target |
|--------|-------------------|--------|
| Task completion time (create a rule) | ~5 minutes | < 2 minutes |
| Navigation clicks to reach any feature | 3-5 clicks | ≤ 2 clicks (or ⌘K) |
| New user onboarding time | ~2 hours | < 30 minutes |
| Page load time | 3-5s | < 1.5s |
| Accessibility score (Lighthouse) | ~40 | > 90 |
| User satisfaction (SUS score) | Unknown | > 75 |
| Mobile usability | Broken | Functional (tablet+) |

---

## 12. Established Patterns

This section documents the architectural patterns that have emerged during implementation. These are the canonical ways to build features in rcx-ui — new pages should follow these patterns rather than inventing alternatives.

### 12.1 ServerTable Framework

The primary pattern for entity list pages with server-side pagination, sorting, filtering, and CRUD operations. Two tiers exist:

**Tier 1 — Config-driven (most entities):** Define a `ServerTableConfig` and render `ServerTablePage`. The framework handles everything: table, search, pagination, drawers, bulk ops, column chooser, preference persistence. New reference data entities require ~40 lines of config + ~20 lines of page component.

- Config example: `src/features/reference-data/locations/config/location-config.ts`
- Page example: `src/features/reference-data/locations/pages/locations-page.tsx`
- Framework: `src/features/reference-data/shared/`

**Tier 2 — Custom composition (complex entities):** Use the same hooks (`useServerTable`, `useEntitySchema`, `useColumnChooser`) but compose the page manually for entities that need custom drawers, alternative views (card grid), stats tiles, or unique interaction patterns.

- Example: `src/features/reward-catalog/pages/reward-catalog-page.tsx`

**Key hooks:**
- `useServerTable` (`reference-data/shared/hooks/use-server-table.ts`) — pagination, sorting, search, column filters, bulk selection state
- `useEntitySchema` (`reference-data/shared/hooks/use-entity-schema.ts`) — runtime schema fetch for core + extension fields, enums, categories
- `useColumnChooser` (`src/shared/hooks/use-column-chooser.ts`) — column visibility, drag-reorder, persistence

### 12.2 EntityEditPage Pattern

Config-driven multi-tab edit page for complex entities (programs, purse policies, tier groups). Define an `EntityEditConfig` with tabs, Zod schema, and field lists — the component handles unsaved changes guards, validation error surfacing across tabs, lock banners, and breadcrumbs.

- Component: `src/shared/components/entity-edit-page.tsx`
- Config examples: `src/features/programs/config/purse-policy-config.tsx`

For entities too complex for the config-driven approach (e.g., activity templates with nested editors), build a custom edit page that replicates the same UX patterns manually.

### 12.3 Form Pattern (React Hook Form + Zod)

All forms use React Hook Form with Zod validation. No exceptions — never use manual `useState` for form state.

- `useForm` with `zodResolver` for all forms
- `Controller` / `watch` / `setValue` for field binding
- `formState.isDirty` for dirty tracking (drives unsaved changes dialog)
- `buildExtZodSchema()` (`src/shared/lib/build-ext-zod-schema.ts`) for dynamic extension field schemas
- `flattenRhfErrors()` (`src/shared/lib/rhf-error-utils.ts`) for surfacing nested errors
- Example: `src/features/reward-catalog/components/reward-form-drawer.tsx`

### 12.4 Extension Field System

Custom fields are stored in MongoDB's `ext` subdocument and defined at runtime via `ExtensionSchema`. The UI discovers these fields dynamically:

1. `useEntitySchema` fetches `/api/schema/{modelName}` to get field definitions, types, enums, categories, and required flags
2. `buildExtZodSchema()` generates a Zod schema from the field definitions
3. `ExtFieldRenderer` renders fields by type (text, number, date, boolean, enum, textarea)
4. Extension fields appear as additional tabs in form drawers (grouped by category) and as extra columns in tables (when `showInList` is true)

- Schema hook: `src/features/reference-data/shared/hooks/use-entity-schema.ts`
- Renderer: `src/shared/components/ext-field-renderer.tsx`
- Types: `src/shared/types/ext-field-def.ts`

### 12.5 User Preference Persistence

UI preferences (table layouts, filter state, form tab order) are persisted to the user's `ext._meta` field via the rle-api. This means preferences roam across browsers/devices.

- `useUserMeta` hook (`src/shared/hooks/use-user-meta.ts`) — `getUserMeta(key)` for sync reads, `patchUserMeta(patch)` for async writes
- Storage key convention: `"{entity}:{preference}"` (e.g., `"reward:tableLayout"`, `"location:formTabOrder"`)
- Loaded once on app startup via `useUserExtLoader()` in the app shell
- Full documentation: `.claude/skills/metadata-storage/SKILL.md`

### 12.6 Generic CRUD Hooks

`src/shared/hooks/use-api.ts` provides TanStack Query wrappers for standard CRUD:

- `useEntityList(endpoint, params)` — paginated list with query, sort, skip, limit, populate
- `useEntity(endpoint, id)` — single entity fetch
- `useCreateEntity(endpoint)` — POST mutation with cache invalidation
- `useUpdateEntity(endpoint)` — PATCH mutation with cache invalidation
- `useDeleteEntity(endpoint)` — DELETE mutation with cache invalidation

Feature-specific hooks (e.g., `useCreateRewardCatalogItem`) are thin wrappers that call these generics with the correct endpoint name.

### 12.7 State Management Split

- **Server state:** TanStack Query with query keys following `[endpoint, "list"|"detail", params]`
- **Auth state:** `useAuthStore` (Zustand) — JWT token + user in sessionStorage, keys prefixed `rcx.auth.*`
- **UI state:** `useUIStore` (Zustand) — sidebar collapsed/expanded, theme, current org/program in localStorage, keys prefixed `rcx.ui.*`
- **Page-local state:** Feature Zustand stores (e.g., `useRewardCatalogStore`) for filter toggles, drawer open/close, view mode — state that is UI-only and doesn't belong in the URL or server
