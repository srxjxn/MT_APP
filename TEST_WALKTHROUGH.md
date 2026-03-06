# Modern Tennis App — Owner Walkthrough Test Script

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
