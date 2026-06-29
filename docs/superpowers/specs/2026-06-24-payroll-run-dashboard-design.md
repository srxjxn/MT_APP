# Payroll Run Dashboard — Design

Date: 2026-06-24
Status: Approved for planning
Area: `app/(admin)/payroll/`, `lib/hooks/useCoachPayroll.ts`, Supabase

## Problem

Payroll generation is unintuitive because it takes too many manual steps, and those
steps repeat for every coach. The current flow (`app/(admin)/payroll/generate.tsx`) is
roughly: select coach, set period start, set period end, tap Calculate Hours, resolve
any "still scheduled" lessons, review rates and summary, tap Create Draft Payout, then
later mark Paid. The owner runs this once per coach.

Two correctness issues compound the confusion:
1. Only `completed` lessons count, and uncompleted ones are excluded silently per coach.
2. Group-lesson pay goes only to the lead `coach_id`. Assistant coaches recorded in
   `lesson_instance_coaches` are not paid for those lessons.

## Goal

Replace the per-coach form with a single period-scoped "Run payroll" screen that opens
already calculated, lists every coach who worked in the period, and creates all draft
payouts in one action. Reduce the common case from ~8 steps per coach to about 2 steps
for all coaches.

## Non-goals

- Changing how payouts are marked Paid (the existing payout list / detail / status flow
  stays as-is). This work ends at creating drafts.
- Changing rate storage. Rates still live on `users` (`group_rate_cents`,
  `drop_in_rate_cents` used as the private rate). Per-payout overrides still supported.
- Redesigning the payout detail or payroll history screens.

## Approach: Period dashboard

New default screen at `app/(admin)/payroll/index.tsx` (or a dedicated `run.tsx` that the
Payroll tab opens). The existing per-coach `generate.tsx` flow is retired as the primary
entry point; its review/override UI is reused inside the per-coach detail (see below).

### Screen layout (top to bottom)

1. Title: "Run payroll".
2. Period selector: shows the current period label (e.g. "Jun 16 – Jun 30") with
   previous/next chevrons. The period is derived from the org's configured cadence
   (see Configurable pay period).
3. Summary strip: three metric cards — Total payout, # coaches paid, # lessons counted.
4. Scheduled-lesson banner (only when count > 0): one org-wide warning, e.g.
   "3 lessons still scheduled, not yet paid" with a Review action that opens the
   existing complete-lessons UI scoped to the period. Completing lessons refreshes
   the dashboard.
5. Coach list: one row per coach with completed lessons in the period:
   - Avatar (initials), name.
   - Hours summary: "12h group · 4h private" (omit a bucket when zero).
   - Computed pay for the period.
   - Right affordance: a "Draft" chip if a payout already exists for this coach+period;
     a "no rate set" flag if the coach is missing a rate; otherwise "tap to review" + chevron.
   - Tapping the row opens the per-coach detail.
6. Primary action (sticky bottom): "Create N drafts · $X". Creates one `coach_payouts`
   row per eligible coach in a single action.

### Per-coach detail

Reuses the existing breakdown and rate-override UI from `generate.tsx`:
- Lesson-by-lesson work log for the period.
- Editable group and private rate fields (default from the coach's saved rates).
- Pay summary (hours × rate = total).
- An action to create / update just this coach's draft.

This keeps the list clean while preserving the ability to verify and override.

## Data

### Aggregated period query

Add a Supabase RPC `get_payroll_period(p_org_id uuid, p_start date, p_end date)` returning
one row per coach who has at least one completed lesson in the period:

- `coach_id`, `first_name`, `last_name`
- `group_hours`, `private_hours` (computed from `duration_minutes`, rounded to 2 decimals)
- `group_rate_cents`, `private_rate_cents` (from `users`)
- `lesson_count`
- `existing_payout_id` (nullable — a `coach_payouts` row for the same `coach_id` and
  exact `period_start`/`period_end`), `existing_payout_status`

This replaces N per-coach `useCoachWorkLog` calls with one query. The RPC must qualify all
column references with the table name (Realtime "ambiguous column" rule in CLAUDE.md) and
use `auth_id = auth.uid()` org scoping via the existing helper functions.

A separate lightweight query returns the count of `scheduled` (uncompleted) past lessons
in the period across all coaches, for the banner.

### Multi-coach group lessons (correctness fix)

A coach's hours for the period must include completed lesson instances where the coach is
EITHER the lead `lesson_instances.coach_id` OR present in `lesson_instance_coaches` for that
instance. Each qualifying coach is credited the full lesson `duration_minutes` (assistant
coaches are paid the same hours as the lead for that lesson). The `get_payroll_period` RPC
and the per-coach work log (`useCoachWorkLog`) both apply this rule so the dashboard and the
detail agree. A lesson where a coach is both lead and listed as additional must be counted
once (dedupe by `lesson_instance_id`).

### Creating drafts

"Create N drafts" inserts a `coach_payouts` row per eligible coach with: `coach_id`,
`org_id`, `period_start`, `period_end`, `group_hours`, `private_hours`, `group_rate_cents`,
`private_rate_cents`, `total_cents` (= round(group_hours × group_rate) + round(private_hours
× private_rate)), `status: 'draft'`. Performed as a batch insert; invalidates the payroll
list and dashboard queries on success.

## Configurable pay period

Store cadence in the existing `organizations.settings` JSON column (no schema change):

```
settings.payroll = { cadence: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly',
                     anchor?: string }
```

- Default when unset: `semimonthly` (preserves today's 1st–15th / 16th–end behavior).
- `weekly` / `biweekly` need an `anchor` date to know where a period starts; week boundary
  defaults to Monday if unset.
- A pure helper `getPayPeriod(cadence, anchor, referenceDate)` returns `{ start, end }` for
  the period containing a reference date, plus `previousPeriod` / `nextPeriod` for the
  chevrons. Lives in `lib/helpers/` and is unit-tested independently of UI.
- A cadence selector is added to admin Settings (`app/(admin)/settings/`). Changing it
  affects which period the dashboard shows; it does not rewrite existing payouts.

## Edge cases

- Coach with zero completed lessons in the period: omitted from the list; show a muted note
  "N coaches had no lessons this period".
- Coach missing a rate (`null`): shown in the list with a "no rate set" flag, excluded from
  "Create all" until set; can still be opened to set a rate inline.
- Coach already has a draft for the exact period: shown with a "Draft" chip and excluded
  from "Create all" so drafts can't be duplicated.
- Empty period (no coaches worked): list shows an empty state; primary action disabled.
- Drafts are snapshots — creating a draft freezes hours/rates/total. Re-running after more
  lessons are completed does not mutate existing drafts (matches current behavior).

## Testing

- Unit: `getPayPeriod` for all four cadences, including period containing the reference
  date and prev/next stepping across month and year boundaries.
- Unit/integration: `get_payroll_period` RPC — lead-only coach, assistant-only coach,
  coach who is both lead and assistant on the same lesson (counted once), coach with no
  lessons (absent), existing-draft detection.
- Multi-coach hours parity between the RPC and `useCoachWorkLog`.
- Total math matches `round(group_hours × group_rate) + round(private_hours × private_rate)`.

## Open questions

None blocking. `weekly`/`biweekly` anchor UX can be refined during planning.
