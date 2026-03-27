# Modern Tennis App — Apple App Store Review Guide & Test Script

---

# Part 1: Apple App Store Review Guide

> **Use this section to respond to Guideline 2.1 — Information Needed.**
> Each subsection maps to one of Apple's six requirements and contains ready-to-paste text.

---

## App Purpose & Description

> *Copy-paste for App Store Connect → "App Review Information → Notes"*

Modern Tennis is a tennis academy management platform that connects coaches, parents, and administrators in a single app. It replaces manual scheduling spreadsheets, paper attendance sheets, and fragmented billing workflows used by small-to-medium tennis academies.

**Core problems solved:**
- Manual lesson scheduling and calendar management
- Paper-based attendance tracking
- Disconnected billing and subscription management
- Lack of communication between coaches and parents

**Three user roles:**
| Role | Description |
|------|-------------|
| **Admin / Owner** | Manages the academy: creates lessons, manages coaches/students/courts, handles billing and payroll |
| **Coach** | Views assigned schedule, marks attendance, adds student notes, manages availability |
| **Parent** | Views children's lessons, browses/enrolls in classes, manages subscriptions and payments, receives notifications |

---

## Screen Recording Script

> **Instructions:** Record on a physical iOS device in one continuous take. Follow these steps in order. The recording should be 3–5 minutes.

### Step 1: Launch & Login (Parent)
1. Cold-launch the app — login screen appears
2. Show the **"Sign in with Apple"** and **"Sign in with Google"** buttons (do not tap)
3. Show the **"Forgot password?"** link
4. Enter email: `carlitos@gmail.com`
5. Enter password: `UTadmit2019!`
6. Tap **"Sign In"** → lands on Parent Home

### Step 2: Account Registration (show only)
1. Tap **"Back"** or **"Sign Out"** to return to login
2. Tap **"Sign Up"**
3. Show the role toggle: **Parent / Coach**
4. Show the form fields: First Name, Last Name, Email, Phone, Password, Confirm Password
5. **Do not submit** — tap **"Back to Sign In"** to return to login

### Step 3: Forgot Password (show only)
1. From login screen, tap **"Forgot password?"**
2. Show the email input and **"Send Reset Link"** button
3. Tap **"Back to Sign In"** to return

### Step 4: Login as Parent
1. Enter `carlitos@gmail.com` / `UTadmit2019!` again
2. Tap **"Sign In"** → Parent Home

### Step 5: Parent Home
1. Show **"Welcome, David!"** message
2. Scroll to show **Upcoming Lessons** section
3. Scroll to show **"My Children"** — Emma and Liam cards
4. Tap **"View Notes"** on Emma's card to show coach notes modal, then close

### Step 6: Schedule (Parent)
1. Navigate to **Schedule** tab
2. Show **"My Lessons"** view with enrolled lessons
3. Toggle to **"Browse All"** to show available lessons
4. Tap a lesson to show the **"Enroll Child"** dialog, then dismiss

### Step 7: Billing (Parent)
1. Navigate to **Billing** tab
2. Show **Membership** tab — Emma's active subscription card
3. Show the **"Continue to Payment"** button on the subscription card
4. Show the disclosure text below the button: *"You'll be redirected to complete payment securely"*
5. **Do NOT tap the button** — explain to the reviewer: *"Tapping this button opens Stripe Checkout in Safari, where the parent completes payment on Stripe's hosted page. The app never collects or stores payment card information."*
6. Show **Packages** tab — hour package with progress bar
7. Show **Payments** tab — payment history

### Step 8: Settings & Account Deletion (Parent)
1. Navigate to **Settings** tab
2. Show profile info (name, email, phone)
3. Tap **"Edit Profile"** to show editable fields, then cancel
4. Scroll to show **"Delete Account"** button
5. Tap **"Delete Account"** → show the confirmation dialog → tap **"Cancel"** (do not delete)

### Step 9: Sign Out & Login as Coach
1. Tap **"Sign Out"** → returns to login screen
2. Enter `coachk@gmail.com` / `UTadmit2019!`
3. Tap **"Sign In"** → lands on **Coach Schedule**

### Step 10: Coach Schedule
1. Show assigned lessons for the week
2. Tap a lesson to show detail with enrolled students and attendance

### Step 11: Coach Students & Notes
1. Navigate to **Students** tab — show student list with hour packages
2. Tap a student to view notes and attendance history

### Step 12: Coach Availability
1. Navigate to **Availability** tab
2. Show availability slots list

### Step 13: Coach Settings & Sign Out
1. Navigate to **Settings**
2. Show profile info
3. Tap **"Sign Out"** → returns to login screen
4. **End recording**

---

## Test Credentials

> *Copy-paste for App Store Connect → "App Review Information → Sign-In Information" and "Notes"*

**Production / TestFlight Accounts:**

**Primary recommended account for review:**
- **Email:** `carlitos@gmail.com`
- **Password:** `UTadmit2019!`

| Role | Email | Password | What they can access |
|------|-------|----------|---------------------|
| Parent | `carlitos@gmail.com` | `UTadmit2019!` | Children, lessons, billing, notifications, settings |
| Coach | `coachk@gmail.com` | `UTadmit2019!` | Coach schedule, student notes, availability, settings |

> **Note:** There is no admin account available for review on production. The two accounts above cover all user-facing functionality.

---

## External Services

> *Copy-paste for App Store Connect → "Notes"*

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| **Supabase** | Backend database, user authentication (email/password, Sign in with Apple, Sign in with Google), real-time subscriptions, edge functions | User profile, email, authentication tokens |
| **Stripe** | Payment processing for real-world tennis lesson subscriptions (Guideline 3.1.5 — physical services consumed outside the app). Payment happens on Stripe's hosted checkout page (`checkout.stripe.com`) in Safari, external to the app. | No raw card data is shared with the app — all payment information is entered on Stripe's PCI DSS Level 1 certified hosted checkout page |
| **Resend** | Transactional email delivery (coach invitation emails only) | Recipient email address |
| **Expo / EAS** | App framework, over-the-air JavaScript bundle updates | Device platform info for update delivery |

---

## Regional Availability

> *Copy-paste for App Store Connect → "Notes"*

- The app functions identically across all regions and territories
- There is no region-specific content, language, or feature gating
- All monetary values are displayed in USD (single-currency implementation)
- The app does not rely on region-specific APIs or services

---

## Regulated Industry

> *Copy-paste for App Store Connect → "Notes"*

- Modern Tennis is **not** in a regulated industry
- The app does not provide health, medical, financial advisory, legal, or gambling services
- Payment processing is handled entirely through **Stripe**, which is PCI DSS compliant — the app never stores, processes, or transmits raw credit card data
- No COPPA concerns: parent accounts manage children's profiles; children do not have their own accounts or direct app access

---

## Payment Processing & Guideline 3.1.5 Compliance

> *Copy-paste for App Store Connect → "App Review Information → Notes"*

### Why This App Uses External Payment (Not In-App Purchase)

Modern Tennis subscriptions pay for **real-world, in-person tennis coaching sessions** at a physical tennis academy. Lessons take place on physical tennis courts with a human coach. The service is consumed entirely outside the app — the app is a scheduling and management tool, not the service itself.

**Apple's Guideline 3.1.5** states:

> *"If your app enables people to purchase physical goods or services that will be consumed outside of the app, you must use purchase methods other than in-app purchase to collect those payments, such as Apple Pay or traditional credit card entry."*

**IAP would violate this guideline.** Apple requires external payment for physical services consumed outside the app.

### What the Subscription Pays For

- Real-world, in-person tennis lessons at a physical tennis academy
- Sessions with a human coach on a physical tennis court
- **Not** digital content, **not** in-app feature unlocks, **not** streaming or media

### What the App Does NOT Do

- ❌ The subscription does not unlock any app features (all features work regardless of payment status)
- ❌ The subscription does not provide digital content (no streaming, no downloads)
- ❌ The subscription does not gate functionality behind a paywall
- ✅ The subscription pays for a **real-world service** (tennis lessons)

### How Payment Works

1. Parent views subscription card in Billing tab → sees **"Continue to Payment"** button
2. Below the button: disclosure text reads *"You'll be redirected to complete payment securely"*
3. Tapping the button opens **Stripe Checkout** — a hosted payment page on `checkout.stripe.com` — in Safari
4. The parent enters payment details on Stripe's page (the app never sees card data)
5. After payment, Stripe redirects back to the app via deep link
6. Stripe sends a webhook to our server, which activates the subscription
7. The app displays the active subscription status

**The app never collects, transmits, or stores payment card information.** All payment processing happens on Stripe's PCI DSS Level 1 certified hosted checkout page, external to the app.

### Precedent

This is the same model used by approved apps in the fitness/coaching category:

| App | Service | Payment Method |
|-----|---------|---------------|
| ClassPass / Mindbody | In-person fitness classes | Stripe (external) |
| CoachUp / PlayYourCourt | In-person sports coaching | Stripe (external) |
| Vagaro / Booksy | In-person salon/spa services | Stripe (external) |
| Uber / Lyft | Real-world transportation | Stripe (external) |
| DoorDash / Grubhub | Real-world food delivery | Stripe (external) |

None of these apps use IAP. Apple's own guidelines prohibit it for physical services.

---

## App Review Notes (Copy-Paste Ready)

> **Copy-paste the block below into App Store Connect → "App Review Information → Notes"**

```
PAYMENT PROCESSING — GUIDELINE 3.1.5 COMPLIANCE

Modern Tennis is a tennis academy management app. Subscriptions in this app
pay for real-world, in-person tennis coaching sessions at a physical tennis
academy — not digital content or in-app features.

Per App Store Review Guideline 3.1.5: "If your app enables people to purchase
physical goods or services that will be consumed outside of the app, you must
use purchase methods other than in-app purchase." Our subscriptions fall
squarely under this guideline, as the service (tennis lessons) is consumed
entirely outside the app on a physical tennis court with a human coach.

Payment flow: When a parent subscribes, they are redirected to Stripe's hosted
checkout page (checkout.stripe.com) in Safari. The app never collects, stores,
or processes payment card information. After payment, the user is returned to
the app via deep link.

This is the same model used by approved apps in the fitness/coaching category
(ClassPass, Mindbody, CoachUp, Vagaro) that sell real-world lesson and service
subscriptions via external payment processors.

The subscription does NOT unlock any app features, digital content, or in-app
functionality. All app features (scheduling, messaging, viewing lessons) are
available to all users regardless of payment status. The subscription is solely
for the real-world tennis coaching service.
```

---
---

# Part 2: Internal QA Walkthrough

> **Below is the full internal QA test script.** Use this for comprehensive testing before each release.

All test users use password: **`password123`**

---

## 1. Auth Flow

### 1A. Login (owner@moderntennis.com)
- [ ] App opens to login screen
- [ ] Email and password fields visible
- [ ] "Forgot password?" link visible
- [ ] "Sign Up" link visible
- [ ] Sign in with Apple / Google buttons visible (Apple on iOS only)
- [ ] Enter `owner@moderntennis.com` / `password123` → lands on **Admin Dashboard**

### 1B. Registration (test with a fresh email)
- [ ] Tap "Sign Up" from login
- [ ] Role toggle visible: Parent / Coach
- [ ] Fill in First Name, Last Name, Email, Phone, Password, Confirm Password
- [ ] Tap "Create Account" → lands on **Verify Email** screen
- [ ] "Resend Verification Email" button works
- [ ] "Back to Sign In" returns to login

### 1C. Forgot Password
- [ ] From login, tap "Forgot password?"
- [ ] Enter email → tap "Send Reset Link"
- [ ] Success screen: "Check Your Email" message shown
- [ ] "Try a different email" resets the form
- [ ] "Back to Sign In" returns to login

---

## 2. Admin Dashboard (owner@moderntennis.com)

- [ ] Welcome / stats grid shows 4 cards: Revenue, Group Classes, Active Memberships, Students
- [ ] Numbers look reasonable (not zero, not absurd)
- [ ] Expiring subscriptions warning card appears if any are expiring soon
- [ ] Quick Actions: "New Lesson Template" and "Add Student" buttons work (navigate to correct screens)
- [ ] Manage grid cards: Courts, Billing, Payroll, Settings — each navigates correctly

---

## 3. Lessons (Admin)

### 3A. Templates List
- [ ] Shows lesson templates grouped by day of week
- [ ] Filter toggle: All / Group / Private works
- [ ] Each card shows: name, coach name, price, court, time, duration
- [ ] Inactive templates show a badge
- [ ] "View Schedule", "Lesson Requests", "Coach Pricing" navigation buttons work
- [ ] FAB "+" opens create template screen

### 3B. Create Template
- [ ] Form fields: Name, Lesson Type, Coach picker, Court picker, Day, Start Time, Duration, Price, Max Students
- [ ] "Create Template" creates the template and auto-generates instances for 4 weeks
- [ ] Success snackbar with count appears
- [ ] Navigate back — new template appears in list

### 3C. Edit Template
- [ ] Tap a template card → edit screen opens with pre-filled values
- [ ] Active/Inactive toggle works
- [ ] "Update Template" saves changes
- [ ] "Delete Template" shows confirmation dialog → deletes on confirm

### 3D. Schedule View
- [ ] Calendar view is default — lessons appear on correct days
- [ ] Toggle to List view works
- [ ] Filters: Lesson Type, Status (Scheduled/Completed/Cancelled), Date Range, Coach
- [ ] "Clear Filters" resets all
- [ ] FAB "Generate" → modal with date range → generates new instances
- [ ] Tap a lesson instance → opens Instance Detail

### 3E. Instance Detail
- [ ] Shows: lesson name, date/time, coach, court, status badge
- [ ] Capacity indicator (e.g., "4/6 enrolled") with progress bar
- [ ] Enrolled students list visible
- [ ] "Confirm Class" button (for scheduled lessons)
- [ ] "Cancel Class" → confirmation dialog → sends notification to parents
- [ ] "Add Student" → student picker → enrolls student
- [ ] Attendance checkboxes work for each student

### 3F. Lesson Requests
- [ ] Status filter: All / Pending / Approved / Declined
- [ ] Pending request cards show: student, coach, requester, preferred date/time
- [ ] "Approve & Schedule" → modal with Date, Start Time, Duration, Court → creates instance
- [ ] "Decline" → modal with optional notes → updates status

### 3G. Coach Pricing
- [ ] Coach cards show drop-in rate and packages
- [ ] Pencil icon on drop-in rate → edit mode → save/cancel
- [ ] Package cards show: name, hours, price per hour
- [ ] Edit/delete package icons work
- [ ] "Add Package" → modal with Name, Hours, Total Price → saves

---

## 4. Students (Admin)

### 4A. Students List
- [ ] Searchbar filters by name in real time
- [ ] Skill level chip filters work (Beginner, Intermediate, Advanced, Elite)
- [ ] Each card shows: name, skill badge, parent name, DOB
- [ ] FAB "+" opens create student screen

### 4B. Create Student
- [ ] Form with parent picker dropdown
- [ ] Fields: First Name, Last Name, DOB, Skill Level
- [ ] Saves and navigates back — new student in list

### 4C. Student Detail / Edit
- [ ] Pre-filled form is editable
- [ ] Age auto-calculated from DOB
- [ ] Attendance section: attended/total with progress bar + recent records
- [ ] Group classes list (read-only)
- [ ] Private coach info (read-only)
- [ ] Notes section: existing notes visible, "Add Note" opens modal with form
- [ ] "Delete Student" → confirmation → deletes

---

## 5. Coaches (Admin)

- [ ] Three sections: Active Coaches, Pending Approval, Pending Invites
- [ ] Active coach cards: name, email, status badge
- [ ] Pending users: "Approve" button → activates the coach
- [ ] Pending invites: "Revoke" button → confirmation → revokes
- [ ] FAB "+" → Invite Coach dialog (enter email) → sends invite

---

## 6. Courts (Admin)

- [ ] Court cards show: name, surface type, indoor/outdoor, status
- [ ] Court 4 should show "Maintenance" status
- [ ] Tap card → Edit screen with pre-filled form
- [ ] "Delete Court" → confirmation → deletes
- [ ] FAB "+" → Create court form

---

## 7. Subscriptions & Billing (Admin)

### 7A. Subscriptions List
- [ ] Status filter: All / Active / Paused / Cancelled
- [ ] Expiring-soon banner appears for subscriptions ending within 7 days
- [ ] Isabella Garcia's subscription shows as expired
- [ ] "View Payments" and "View Packages" navigation buttons work
- [ ] FAB "+" → Create subscription form

### 7B. Payments
- [ ] Filter by: Status, Payment Type, Parent, Date Range
- [ ] "Clear All Filters" resets
- [ ] Payment cards show: amount, status, type, date, parent
- [ ] Priya Patel has a refund ($35) — verify it displays correctly
- [ ] FAB "+" → Record payment modal

### 7C. Packages
- [ ] Student package cards with hours progress bar (e.g., Mia Chen 3/5 hours used)
- [ ] "Bill Parent" button appears when hours are low
- [ ] Pull-to-refresh works

---

## 8. Payroll (Admin)

### 8A. Payroll List
- [ ] Status filter: All / Draft / Approved / Paid
- [ ] Coach rates card visible
- [ ] FAB "+" → Generate payroll screen

### 8B. Generate Payroll
- [ ] Select coach from dropdown
- [ ] Pick period start/end dates
- [ ] "Calculate Hours" → shows work log (lessons taught) + summary
- [ ] "Create Draft Payout" → creates and navigates back

### 8C. Payout Detail
- [ ] Info card: coach name, period, status badge
- [ ] Work log items listed
- [ ] Draft: "Approve" and "Delete Draft" buttons
- [ ] Approved: "Mark as Paid" button

---

## 9. Admin Settings & Notifications

### 9A. Settings
- [ ] Profile card: name, email, phone displayed
- [ ] "Edit Profile" → fields become editable → Cancel / Save
- [ ] "Manage Team" card navigates to team screen
- [ ] "Sign Out" works
- [ ] "Delete Account" shows confirmation

### 9B. Notifications
- [ ] Notification list with unread indicators
- [ ] "Mark All Read" button
- [ ] FAB "Send" → compose modal with: Recipient picker, Title, Message → sends

---

## 10. Coach View (coach.sarah@moderntennis.com)

Sign out of admin, sign in as Coach Sarah.

### 10A. Schedule Tab
- [ ] Shows Sarah's lessons only (Mon/Wed/Fri)
- [ ] Lesson Type filter: All / Group / Private
- [ ] Tap a lesson → detail modal: name, date/time, enrolled students, attendance
- [ ] "Add Note for Student" → pick student → write note → save
- [ ] Close modal

### 10B. Availability Tab
- [ ] List of availability slots (if seeded)
- [ ] FAB "+" → modal: Day, Start Time, End Time, Recurring toggle, Specific Date
- [ ] Save → new slot appears
- [ ] Delete icon → confirmation → removes slot

### 10C. Students Tab
- [ ] Read-only list of student hour packages
- [ ] Progress bars showing hours used vs purchased

### 10D. Settings
- [ ] Same profile edit flow as admin
- [ ] Sign Out works

---

## 11. Parent View (parent.johnson@email.com)

Sign out of coach, sign in as Parent Johnson.

### 11A. Home Tab
- [ ] "Welcome, David!" message
- [ ] Monthly attendance card visible
- [ ] Upcoming Lessons section: up to 5 lessons listed with student name, lesson name, date/time, coach, court
- [ ] "My Children" section: 2 cards — Emma (Intermediate) and Liam (Beginner)
- [ ] Each child card: name, skill badge, DOB
- [ ] "View Notes" → modal with public notes from coaches (Emma should have 1 public note from Sarah)
- [ ] "Add Child" button at bottom

### 11B. Schedule Tab
- [ ] Toggle: Schedule / Private Lessons
- [ ] Sub-toggle: My Lessons / Browse All
- [ ] My Lessons shows only enrolled lessons for Emma and Liam
- [ ] Browse All shows all available lessons
- [ ] Lesson Type filter works
- [ ] Tap a lesson → "Enroll Child" dialog

### 11C. Billing Tab
- [ ] Three tabs: Membership / Packages / Payments
- [ ] Membership: Emma's active $225/month subscription visible
- [ ] Packages: Sarah's 5-hour package (1/5 used)
- [ ] Payments: 2 completed payments ($120 each)

### 11D. Notifications
- [ ] 5 notifications (mix of read/unread)
- [ ] Tap unread → marks as read
- [ ] "Mark All Read" clears all

### 11E. Settings
- [ ] Profile shows David Johnson's info
- [ ] Edit / Save / Sign Out / Delete Account all accessible

---

## 12. Edge Cases to Spot-Check

- [ ] **Expired subscription**: Log in as `parent.garcia@email.com` — Isabella's subscription is expired. Does the UI communicate this clearly?
- [ ] **Drop-in parent (no subscription)**: Log in as `parent.patel@email.com` — Ava has no subscription. Does billing tab handle this gracefully?
- [ ] **Refund**: Patel family has a $35 refund in payment history — displays correctly?
- [ ] **Elite student**: Log in as `parent.chen@email.com` — Mia is Elite skill. Package shows 3/5 hours used. Approved lesson request visible?
- [ ] **Court under maintenance**: In admin Courts, Court 4 shows maintenance status
- [ ] **Pull-to-refresh**: Works on all list screens (parent home, schedule, billing, admin lists)
- [ ] **Empty states**: If a parent has no children, no lessons, no payments — do empty state messages and CTAs appear?

---

## How to Use This Script

1. Open the app on TestFlight (or local dev with `npx expo start`)
2. Walk through each section in order with the app owner
3. Check each box as you go
4. Note any issues, UI feedback, or feature requests next to the relevant item
5. Prioritize fixes after completing the full walkthrough
