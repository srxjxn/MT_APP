# Test Coverage Analysis — Modern Tennis (MT_APP)

## Current State

**Test coverage: 0%.** The codebase has **153 TypeScript/TSX source files** and **zero test files**. There is no test framework installed, no test scripts in `package.json`, and no CI/CD pipeline running automated checks. The only QA artifact is `TEST_WALKTHROUGH.md`, a manual test script.

---

## Recommended Testing Stack

| Layer | Tool | Why |
|-------|------|-----|
| Unit tests | **Jest** + `ts-jest` | Standard for React Native / Expo projects |
| Component tests | **React Native Testing Library** (`@testing-library/react-native`) | Renders components in a lightweight environment |
| Hook tests | `renderHook` from `@testing-library/react-native` | Test custom hooks in isolation |
| Validation tests | Jest (direct Zod schema calls) | No rendering needed — pure function tests |
| E2E tests (later) | **Maestro** or **Detox** | Full device-level flows |

---

## Priority Areas for Test Coverage

### Priority 1 — Validation Schemas (11 files, highest ROI)

**Why first:** Pure functions, zero dependencies, easy to test, and they guard every form in the app. A bad validation rule silently lets invalid data into Supabase.

| File | Key things to test |
|------|--------------------|
| `lib/validation/payment.ts` | `amount_cents` must be ≥ 1; invalid `payment_type` rejected; optional fields truly optional |
| `lib/validation/subscription.ts` | `price_cents` ≥ 0; `starts_at` required; status must be one of the enum values |
| `lib/validation/lessonTemplate.ts` | Day-of-week range (0–6); duration positive; `start_time` format |
| `lib/validation/student.ts` | Required name fields; email format if present |
| `lib/validation/court.ts` | Name required; capacity constraints |
| `lib/validation/availability.ts` | Time range validity (start < end) |
| `lib/validation/coachPackage.ts` | Pricing and lesson count constraints |
| `lib/validation/coachPayout.ts` | Amount constraints |
| `lib/validation/invite.ts` | Email format; role enum |
| `lib/validation/lessonRequest.ts` | Required fields for lesson requests |
| `lib/validation/studentNote.ts` | Non-empty content |

**Example test pattern:**
```ts
import { paymentSchema } from '../lib/validation/payment';

describe('paymentSchema', () => {
  it('rejects zero amount', () => {
    const result = paymentSchema.safeParse({ user_id: 'u1', amount_cents: 0, payment_type: 'lesson', payment_status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts valid payment', () => {
    const result = paymentSchema.safeParse({ user_id: 'u1', amount_cents: 5000, payment_type: 'subscription', payment_status: 'completed' });
    expect(result.success).toBe(true);
  });
});
```

---

### Priority 2 — `generateInstancesForTemplates` (critical scheduling algorithm)

**File:** `lib/helpers/generateInstances.ts`

This is the most complex pure-logic function in the codebase. It handles date iteration, day-of-week matching, time arithmetic, and conflict detection. Bugs here create duplicate or missing lessons for paying customers.

**Key test cases:**
- Generates correct instances for a single template across a one-week range
- Matches the correct `day_of_week` (Sunday = 0 edge case)
- Calculates `end_time` correctly, including when it crosses an hour boundary (e.g., 9:45 + 90 min = 11:15)
- Returns empty when date range has no matching days
- Skips instances when there's a DB conflict (mock Supabase)
- Skips intra-batch conflicts (two templates, same coach, same time slot, same day)
- Handles edge case: `dateFrom === dateTo` (single day)
- Handles edge case: `dateFrom > dateTo` (should return empty)

---

### Priority 3 — Auth Store (`lib/stores/authStore.ts`)

**Why:** Every screen depends on auth state. A regression here logs out all users or misroutes them.

**Key test cases:**
- `setSession(session)` sets `isAuthenticated: true` and extracts `user`
- `setSession(null)` clears user and sets `isAuthenticated: false`
- `setUserProfile(profile)` correctly derives `userRole`
- `reset()` returns all fields to initial state
- `setViewMode` toggles between `'admin'` and `'coach'`

---

### Priority 4 — Stripe Webhook Handler (`supabase/functions/stripe-webhook/index.ts`)

**Why:** This is the most financially sensitive code in the app. A bug means lost revenue or incorrect billing records. It handles 6 different Stripe event types with complex DB interactions.

**Key test cases:**
- `payment_intent.succeeded` — updates existing payment to `completed`
- `payment_intent.succeeded` — creates new payment record from metadata when no existing record
- `payment_intent.succeeded` — skips insert when metadata lacks `user_id`/`org_id`
- `payment_intent.payment_failed` — marks payment as `failed`
- `invoice.paid` — creates recurring payment record linked to subscription
- `invoice.payment_failed` — records failed subscription payment
- `customer.subscription.updated` — maps all Stripe statuses correctly (`past_due` → `active`, `canceled` → `cancelled`, etc.)
- `customer.subscription.deleted` — sets status to `cancelled`
- Invalid/missing signature → 400 response
- Non-POST request → 405 response
- Unknown event type → 200 (acknowledged, no-op)

**Testing approach:** Mock `Deno.env`, the `fetch` API, and the Supabase client. Use a Deno test runner or extract the logic into testable functions.

---

### Priority 5 — Stripe Integration Helpers

**Files:**
- `lib/stripe/ensureCustomer.ts`
- `supabase/functions/create-stripe-subscription/index.ts`
- `supabase/functions/create-payment-intent/index.ts`
- `supabase/functions/cancel-stripe-subscription/index.ts`

**Key test cases:**
- `ensureCustomer` returns existing customer ID when one exists in DB
- `ensureCustomer` creates a new Stripe customer when none exists
- `create-stripe-subscription` returns `clientSecret` on success
- `create-stripe-subscription` returns 400 when missing required params
- `cancel-stripe-subscription` handles already-cancelled subscriptions gracefully
- `create-payment-intent` validates amount and metadata

---

### Priority 6 — Data-Fetching Hooks (26 hooks)

These are the data backbone of the app. Test the query key structure and mutation side effects (cache invalidation).

**Highest-value hooks to test first:**
| Hook | Why |
|------|-----|
| `useAuth` | Auth flow correctness |
| `usePayments` | Financial data |
| `useSubscriptions` | Recurring billing state |
| `useLessonInstances` | Core scheduling feature |
| `useEnrollments` | Student-lesson assignments |
| `useCoachPayroll` | Coach compensation |

**Testing approach:** Use `@tanstack/react-query` test utilities with a `QueryClientProvider` wrapper and mock `supabase` calls.

---

### Priority 7 — Complex Form Components

| Component | Why |
|-----------|-----|
| `LessonTemplateForm` | Many interdependent fields (day, time, duration, court, coach) |
| `SubscriptionForm` | Stripe price linking, date validation |
| `PaymentForm` | Financial input, platform selection |
| `StudentForm` | Core onboarding flow |
| `AvailabilityForm` | Time slot logic |

**Test focus:** Rendering, validation error display, submit callback arguments.

---

## What NOT to Test (Low ROI)

- Layout files (`_layout.tsx`) — mostly Expo Router boilerplate
- `database.types.ts` — auto-generated
- `constants/theme.ts`, `constants/layout.ts` — static values
- Simple UI wrappers (`LoadingScreen`, `EmptyState`, `StatusBadge`) — minimal logic

---

## Suggested Setup Steps

1. Install dependencies:
   ```bash
   npm install --save-dev jest ts-jest @types/jest @testing-library/react-native @testing-library/jest-native jest-expo
   ```

2. Add to `package.json`:
   ```json
   "scripts": {
     "test": "jest",
     "test:watch": "jest --watch",
     "test:coverage": "jest --coverage"
   }
   ```

3. Create `jest.config.js` with `jest-expo` preset.

4. Start with validation schemas (can write 50+ test cases in an afternoon).

5. Add `generateInstances` tests next (mock Supabase client).

6. Expand outward from there.

---

## Coverage Targets

| Milestone | Target | Focus |
|-----------|--------|-------|
| Phase 1 | ~15% | Validation schemas + `generateInstances` + auth store |
| Phase 2 | ~35% | Stripe webhook + edge functions + payment hooks |
| Phase 3 | ~55% | Remaining hooks + form components |
| Phase 4 | ~70% | Screen-level integration tests |
