# Modern Tennis App - Architecture & Laptop Transfer Guide

Generated: 2026-04-20

---

## Architecture Overview

### Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo (SDK 53) + Expo Router (file-based routing) |
| UI | React Native Paper (Material Design) |
| Language | TypeScript 5.9 (strict mode) |
| State | Zustand (auth + UI stores) |
| Data Fetching | TanStack Query v5 |
| Database | Supabase (PostgreSQL v17, hosted) |
| Payments | Stripe (Edge Functions for server-side, Embedded Checkout for client) |
| Auth | Supabase Auth (email/password, Google OAuth, Apple Sign-In) |
| Validation | Zod v4 |
| Build/Deploy | EAS (Expo Application Services) |
| OTA Updates | Expo Updates |

### Directory Structure

```
tennis-crm/
  app/
    (auth)/        # Login, register, role-select, onboarding
    (admin)/       # Owner/admin: lessons, students, billing, payroll, courts, team
    (coach)/       # Coach: schedule, history, availability
    (parent)/      # Parent: dashboard, lessons, billing
  components/      # 45 shared UI components (organized by domain)
  lib/
    hooks/         # 28 TanStack Query hooks (data fetching + mutations)
    stores/        # Zustand stores: authStore.ts, uiStore.ts
    types/         # database.types.ts (auto-generated) + index.ts aliases
    validation/    # Zod schemas
    helpers/       # Pure utility functions
    stripe/        # Stripe customer logic
    supabase.ts    # Supabase client singleton
    queryClient.ts # TanStack Query config
  supabase/
    migrations/    # 33 numbered SQL migrations
    functions/     # 8 Supabase Edge Functions (Stripe webhooks, payments, invites)
    config.toml    # Local Supabase CLI config
    seed.sql       # Dev seed data (10 test users)
  constants/       # Theme colors, layout
  assets/          # Icons, splash screen
```

### Key Architecture Concepts

- **Users table**: has both `id` (app PK) and `auth_id` (FK to `auth.users`) -- they are NOT the same
- **Roles**: `owner | admin | coach | parent`
- **Single org**: `DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001'`
- **RLS**: Row-Level Security on all tables using helper functions `get_user_org_id()`, `get_user_role()`, `get_user_id()`
- **Type alias**: `UserProfile` (not `User`) to avoid collision with Supabase auth type

### External Services

| Service | Dashboard URL |
|---------|--------------|
| Supabase (prod) | https://supabase.com/dashboard (check your project ref in Supabase settings) |
| Stripe | https://dashboard.stripe.com |
| Expo / EAS | https://expo.dev (project ID: 3cfc023b-2a3e-42c6-a768-8935fe9a41a6) |
| App Store Connect | https://appstoreconnect.apple.com (ASC App ID: 6759553554) |
| GitHub | https://github.com/srxjxn/MT_APP |
| Google Cloud Console | https://console.cloud.google.com (for OAuth credentials) |

---

## Laptop Transfer Checklist

### Step 1: Prerequisites on New Laptop

Install these before anything else:

```bash
# 1. Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Node.js 20 (MUST be Node 20 -- Node 18 causes Metro crash)
brew install nvm
nvm install 20
nvm use 20

# 3. Git
brew install git

# 4. Docker Desktop (required for local Supabase)
# Download from https://www.docker.com/products/docker-desktop/

# 5. Supabase CLI
brew install supabase/tap/supabase

# 6. EAS CLI (global)
npm install -g eas-cli

# 7. Xcode (from Mac App Store -- required for iOS builds/simulator)
# After install: xcode-select --install

# 8. Watchman (optional but recommended for Metro)
brew install watchman
```

### Step 2: Clone the Repo

```bash
git clone https://github.com/srxjxn/MT_APP.git
cd MT_APP/tennis-crm
```

### Step 3: Create Secret/Config Files

These files are in `.gitignore` and must be recreated manually on every new machine.

> **Where to find the real values:**
> - **Supabase keys**: Supabase Dashboard > Project Settings > API
> - **Stripe keys**: Stripe Dashboard > Developers > API keys
> - **Google OAuth**: Google Cloud Console > APIs & Services > Credentials
> - **Local Supabase anon key**: Output of `npx supabase start` (same default key on every machine)

#### `.env.local` (local development)

```bash
cat > .env.local << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-local-supabase-anon-key>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-test-publishable-key>
EOF
```

> The local anon key is the default Supabase local dev key (same on every machine). Get it from `supabase start` output or your current `.env.local`. The Stripe test key is from Stripe Dashboard > Developers > API keys (test mode).

#### `.env.production` (production deploy)

```bash
cat > .env.production << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-prod-anon-key>
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=<your-stripe-live-publishable-key>
EOF
```

#### `.google-oauth-credentials` (Google Sign-In)

```bash
cat > .google-oauth-credentials << 'EOF'
Google OAuth Credentials (Web Application - Modern Tennis Supabase)
DO NOT COMMIT THIS FILE

Client ID: <your-google-oauth-client-id>
Client Secret: <your-google-oauth-client-secret>
EOF
```

#### `google-service-account.json` (Android Play Store submissions)

If you have this file on your current laptop, copy it over. It's used for `eas submit` to Google Play. If you don't have it yet, you can generate a new one from the Google Play Console > Setup > API access.

### Step 4: Install Dependencies

```bash
cd tennis-crm
npm install --legacy-peer-deps
```

> The `--legacy-peer-deps` flag is required due to React 19 peer dependency conflicts. There's an `.npmrc` in the repo that sets this automatically.

### Step 5: Log Into Services

```bash
# Expo / EAS account
npx eas-cli login
# Use Apple ID: srujandommeti09@gmail.com

# Supabase CLI (for managing production)
npx supabase login

# Verify EAS project link
npx eas-cli whoami
```

### Step 6: Start Local Development

```bash
# Start Docker Desktop first, then:
npx supabase start          # Starts local Supabase (Postgres, Auth, APIs)
npx supabase db reset        # Applies all migrations + seed data

# In another terminal:
npx expo start               # Starts Metro bundler
# Press 'i' for iOS simulator or scan QR with Expo Go
```

### Step 7: Verify Everything Works

- [ ] `npx supabase start` completes without errors
- [ ] `npx expo start` runs Metro bundler
- [ ] App loads in iOS simulator
- [ ] Can log in with `owner@moderntennis.com` / `password123`
- [ ] Dashboard loads with seed data

---

## Publishing Updates (OTA) from the New Laptop

This is the critical workflow for pushing updates to the live App Store app:

### Quick OTA Update (no native code changes)

```bash
cd tennis-crm

# 1. CRITICAL: Disable local env so production values are used
mv .env.local .env.local.bak

# 2. Push the update
npx eas-cli update --branch production --platform ios --message "describe your changes"

# 3. Restore local env
mv .env.local.bak .env.local
```

### Full Native Build (when native dependencies change)

```bash
# Build for production
npx eas-cli build --platform ios --profile production

# Submit to App Store
npx eas-cli submit --platform ios --profile production
```

### Production Migration Checklist

If your update includes database changes:

1. Review the new migration SQL
2. Run the migration on **production first** via Supabase Dashboard > SQL Editor
3. Then do the OTA update (steps above)

---

## Files NOT in Git (Must Transfer Manually)

| File | Purpose | How to Get It |
|------|---------|---------------|
| `.env.local` | Local dev Supabase + Stripe keys | Copy from this guide above |
| `.env.production` | Production Supabase + Stripe keys | Copy from this guide above |
| `.google-oauth-credentials` | Google OAuth client ID/secret | Copy from this guide above |
| `google-service-account.json` | Android Play Store deploy key | Google Play Console > API access |
| `node_modules/` | Dependencies | `npm install --legacy-peer-deps` |
| `ios/` / `android/` | Native builds | Generated by `npx expo prebuild` or EAS |

---

## Service Credentials Quick Reference

| Service | Login |
|---------|-------|
| Apple ID / App Store Connect | srujandommeti09@gmail.com |
| Expo / EAS | srujandommeti09@gmail.com |
| Supabase | Log in via GitHub or email at supabase.com |
| Stripe | Log in at dashboard.stripe.com |
| GitHub | github.com/srxjxn |
| Google Cloud Console | srujandommeti09@gmail.com |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Metro crash on start | Make sure you're on Node 20: `nvm use 20` |
| `supabase start` stalls | `supabase stop --no-backup`, prune Docker volumes, restart Docker, try again |
| OTA update uses wrong env | You forgot to rename `.env.local` -- it overrides `.env.production` |
| `eas update` fails with web error | Must pass `--platform ios` (no react-native-web in project) |
| Edge functions 401 after deploy | `supabase functions deploy` resets `verify_jwt`; set back to `false` in config.toml |
| npm install peer dep errors | Use `npm install --legacy-peer-deps` |
| Types out of date after migration | Run `npx supabase gen types typescript --local > lib/types/database.types.ts` |

---

## Best Practices for Multi-Laptop Workflow

1. **Always pull before working**: `git pull origin main` to get latest changes
2. **Never commit `.env` files**: They're in `.gitignore` for a reason
3. **Keep this guide handy**: It has the structure and steps; pull actual key values from the service dashboards listed above
4. **Use the same Node version**: Always Node 20 via nvm
5. **EAS builds are cloud-based**: You don't need Xcode for production builds, just for simulator testing
6. **Supabase migrations go through git**: Write migrations locally, test, commit, then apply to production via Dashboard
