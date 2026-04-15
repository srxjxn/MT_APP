# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Modern Tennis CRM — a mobile app for tennis academies to manage coaches, students, lessons, and billing.

- **Stack**: Expo Router, React Native Paper, Zustand, TanStack Query, Supabase, Zod
- **Package manager**: npm (use `--legacy-peer-deps` for installs due to React 19 peer dep conflicts)
- **Node version**: Must use Node 20 (`nvm use 20`) — Node 18 causes Metro crash

## Project Structure

```
tennis-crm/
  app/
    (auth)/        # Login/signup screens
    (admin)/       # Owner/admin dashboard, lessons, students, billing
    (coach)/       # Coach schedule, history, availability
    (parent)/      # Parent dashboard, child enrollment
  components/      # Shared UI components
  lib/
    hooks/         # TanStack Query hooks (data fetching/mutations)
    stores/        # Zustand stores (auth, UI)
    types/         # TypeScript types (database.types.ts + index.ts aliases)
    validation/    # Zod schemas
    helpers/       # Pure utility functions
  supabase/
    migrations/    # Numbered SQL migrations (00001–00029)
    seed.sql       # Dev seed data
  constants/       # Theme, layout constants
```

## Key Architecture Rules

### Users Table
- `users` table has BOTH `id` (PK) and `auth_id` (FK to `auth.users`) — they are NOT the same column
- Type alias: `UserProfile` (not `User`) to avoid collision with Supabase's auth `User` type
- Auth store has `user` (Supabase auth User) and `userProfile` (app users table row)
- Use `userProfile?.org_id` for org scoping, NOT `user?.org_id`

### Roles
- 4 roles: `owner` | `admin` | `coach` | `parent`
- Single org: `DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'`

### Theme Constants
- Use `COLORS.textPrimary` (not `COLORS.text`)
- No `COLORS.textLight` — use `'#FFFFFF'` directly
- No `COLORS.disabled` — use `COLORS.textDisabled`

## Supabase

### Local Development
- Supabase CLI + Docker, ports 54321/54322/54323
- Config: analytics disabled, storage disabled (Docker health check failures)
- If `supabase start` stalls: `supabase stop --no-backup`, prune Docker volumes, restart

### SQL Migrations — CRITICAL RULES
- **RLS policies: MUST qualify column refs with table name** (e.g., `courts.org_id` not `org_id`) — Realtime service causes "column reference is ambiguous" otherwise
- RLS helper functions: `get_user_org_id()`, `get_user_role()`, `get_user_id()` — all use `auth_id = auth.uid()`
- Regenerate types after migration: `npx supabase gen types typescript --local > lib/types/database.types.ts`
  - Clean the output: remove any stderr lines (e.g., "Connecting to db" or CLI update notices) from top/bottom

### Seed Data
- auth.users inserts MUST include `email_change`, `phone_change`, etc. with empty string defaults
- Password hash: `crypt('password123', gen_salt('bf'))` (dynamic generation)
- Seed uses separate `*_auth` (auth.users.id) and `*_uid` (users.id) variables

### Schema Notes
- `lesson_templates`: uses `lesson_type` (not `type`) and `duration_minutes` (not `end_time`)
- `lesson_instances`: has `start_time`/`end_time` and denormalized `name`/`lesson_type`/`duration_minutes`/`max_students`/`price_cents`
- `skill_level` enum: `beginner` | `intermediate` | `advanced` | `elite` (NOT competitive)
- `lesson_instance_coaches`: junction table for multi-coach group lessons (additional coaches beyond lead `coach_id`)

## Seed Users (all password: password123)

| Email | Role |
|---|---|
| owner@moderntennis.com | owner |
| admin@moderntennis.com | admin |
| coach.sarah@moderntennis.com | coach |
| coach.mike@moderntennis.com | coach |
| coach.lisa@moderntennis.com | coach |
| parent.johnson@email.com | parent |
| parent.williams@email.com | parent |
| parent.garcia@email.com | parent |
| parent.chen@email.com | parent |
| parent.patel@email.com | parent |

## Deployment

### EAS / App Store
- App is LIVE on iOS App Store
- Bundle ID: `com.moderntennis.app`
- Use `npx eas-cli` (not `eas` directly — not in PATH)
- OTA update: `npx eas-cli update --branch production --platform ios --message "..."`
- Must specify `--platform ios` (no `react-native-web`, `--platform=all` fails)
- **CRITICAL: Rename `.env.local` → `.env.local.bak` before `eas update`** — it overrides `.env.production`

### Production Migration Checklist
1. Check for unapplied migrations vs production
2. Apply new migrations to production FIRST (Supabase Dashboard SQL Editor)
3. Rename `.env.local` → `.env.local.bak`
4. Run `npx eas-cli update --branch production --platform ios --message "..."`
5. Restore `.env.local.bak` → `.env.local`

### Stripe
- Edge functions require `verify_jwt = false` in `config.toml` — `supabase functions deploy` resets this

## Communication Preferences
- Always explain SQL migrations when asking to run them on production
- **SQL queries must be single-line** — when providing SQL for the user to run (e.g., in Supabase Dashboard SQL Editor), write each query on a single line. Do not break SQL statements across multiple lines.
