# Modern Tennis Web Back-Office — Architecture & Phase 1 (Payroll)

Date: 2026-06-27
Status: Approved for planning
Relates to: `2026-06-24-payroll-run-dashboard-design.md`

## Problem

The mobile admin experience is too complex for the academy operator (Ben), who is a
coach/admin hybrid. The admin dashboard (`app/(admin)/dashboard.tsx`) is a launchpad into
a large, deeply nested set of back-office screens (payroll, billing, subscriptions,
students, lessons, coaches, courts, team, settings). The data-heavy tasks — payroll
especially — are painful on a phone. Ben does on-court work on mobile but would rather do
back-office work at a desk.

## Decision

Do not move the dashboard wholesale to web, and do not keep everything on mobile. Instead:

1. **Split by context.** Mobile app = on-court work. New web app = back-office work. Both
   read/write the SAME academy Supabase project (`ztbhshtdqkozmczsobaz`) — one database,
   two front doors.
2. **Separate web app**, not an addition to the existing marketing site.
3. **Phased**, starting with payroll (reuses the payroll-run-dashboard design).

### Why a separate app (not inside ModernTennis-Website)

The website is a public client marketing site on a DIFFERENT Supabase project
(`tctcqkyzftujmqvshlpm`, CMS content + AI usage only). The back-office is an internal,
login-gated operations tool on the academy database. Keeping them separate avoids: two
Supabase clients tangled in one repo, a shared blast radius (an admin deploy breaking the
public site), and public-site-plus-gated-tool middleware complexity. The only advantage of
embedding — a slightly faster start — disappears after initial setup, while the coupling
cost is permanent. The new app still reuses the academy Supabase auth/RLS/roles and can
import the mobile app's generated `database.types.ts` to stay type-aligned. It is a second
front door to the same house, not a second house.

## Device responsibility split

- **Mobile app (on court):** today's schedule, mark lessons complete, set availability,
  look up a student, quick glance at stats. Coach and parent roles stay mobile-first.
  Admin surface on mobile is trimmed to these essentials over time as web screens land.
- **Web app (back office):** run payroll, billing & subscriptions, manage students &
  lessons, coaches/courts/team, reports & setup.

## Architecture

- **Stack:** new Next.js (App Router) app on its own Vercel project. Tailwind for styling;
  may copy design tokens from ModernTennis-Website for brand consistency.
- **Data:** `@supabase/supabase-js` pointed at the academy Supabase project. Same URL/anon
  key as the mobile app's `.env.production` (`EXPO_PUBLIC_*` -> `NEXT_PUBLIC_*`). All access
  goes through existing RLS — no service-role key in the browser.
- **Types:** import/copy the app's `lib/types/database.types.ts`; regenerate from the same
  project so web and mobile share one schema source of truth.
- **Auth:** Supabase Auth against the academy project (email/password; same users as the
  app). Web sessions via `@supabase/ssr` cookies. Route protection in Next.js middleware:
  only `owner`/`admin` roles may reach `/(dashboard)` routes; everyone else is redirected.
  Roles resolve via the existing `get_user_role()` / `users.role` model.
- **Shared backend changes benefit both clients.** The payroll RPC, multi-coach pay fix,
  and configurable cadence (below) are Supabase-side and serve mobile and web alike.

## Phase 1 scope — payroll on web

Port the approved payroll-run-dashboard design to the web app as the first back-office
screen. Carries over directly from `2026-06-24-payroll-run-dashboard-design.md`:
- Period-scoped "Run payroll" screen, auto-calculated, all coaches in one list,
  "Create N drafts" in one action, per-coach detail with rate overrides.
- Backend (shared, build once in Supabase): `get_payroll_period` RPC; multi-coach pay
  correctness fix (`lesson_instance_coaches`); configurable cadence in
  `organizations.settings`.
- The UI target changes from React Native to Next.js. The mobile payroll screens are left
  as-is for now (not rebuilt on mobile); they can be removed once web payroll is adopted.

Phase 1 also includes the minimum app shell: auth/login, role-gated layout, and one nav
home, so payroll has somewhere to live.

Phase 1 MUST also let an owner/admin set a coach's saved pay rates (both
`users.group_rate_cents` and `users.drop_in_rate_cents`, the latter used as the private
rate). This is required because in the mobile app the private rate is currently
unsettable: payroll reads `users.drop_in_rate_cents` (defaulting to 0), but the only UI
that writes it (`app/(admin)/lessons/coach-pricing.tsx`) has no navigation entry point,
and the coach detail page edits only the group rate (drop-in editor removed in commit
657ee44). So web payroll would inherit a blank private rate unless the web app provides a
reachable rate editor. Per the decision to leave mobile untouched, the fix lives only in
the web app (a coach rate editor, e.g. on the per-coach payroll detail or a coaches
screen) writing both rate columns; mobile is not modified.

## Phasing roadmap (after Phase 1)

Each phase adds a web screen and lets the matching mobile admin screen be trimmed:
2. Billing & subscriptions. 3. Students & lessons management. 4. Coaches/courts/team &
settings. Order is adjustable; payroll is fixed as first because its design is done.

## Non-goals

- Not rebuilding coach or parent experiences on web; they stay mobile.
- Not migrating or merging the two Supabase projects.
- Not removing mobile admin screens in Phase 1 (trim later, per phase).
- No service-role/admin API in the browser; RLS is the authorization boundary.

## Testing

- Auth/middleware: non-admin roles cannot reach `/(dashboard)`; unauthenticated users are
  redirected to login.
- Payroll parity: web payroll totals match the shared RPC and the rules in the payroll spec.
- Type alignment: web builds against the same `database.types.ts` schema as mobile.

## Open questions

- Subdomain choice (e.g. `app.` vs `admin.moderntennis...`) — cosmetic, decide at setup.
- Whether to share types via a copied file or a small published package — default to a
  copied file for Phase 1.
