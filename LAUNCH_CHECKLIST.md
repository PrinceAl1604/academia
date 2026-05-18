# Brightroots launch checklist

A pre-launch smoke test plan for the **live production domain**.
Walk through every section in order, on real devices, with real
accounts. Anything red is a launch blocker — fix, redeploy, re-run.

Date: `____________`  Tester: `____________`  Build SHA: `____________`

---

## Section 0 — Config sanity (10 min)

Before clicking anything in the app, verify the platform basics. These
are the failures that look "fine" until a user hits a specific flow.

- [ ] **Domain** resolves and serves HTTPS without certificate warnings
- [ ] `https://yourdomain.com/api/health` returns `200` with
      `{ ok: true, checks: { database: "ok" } }`
- [ ] **Robots**: `/robots.txt` shows the production domain in the sitemap line, not the Vercel preview URL
- [ ] **Sitemap**: `/sitemap.xml` lists at least `/`, `/courses`, `/privacy`, `/terms`
- [ ] **Favicon + OG**: open the homepage URL in a tool like https://www.opengraph.xyz/ and confirm title, description, and image render
- [ ] **Vercel env vars** all set in Production scope (not just Preview):
      `CRON_SECRET`, `PUSH_INTERNAL_SECRET`, `MONETBIL_SERVICE_SECRET`,
      `CINETPAY_WEBHOOK_SECRET`, `CHARIOW_WEBHOOK_SECRET`,
      `RESEND_API_KEY`, `FROM_EMAIL`, `ADMIN_ALERT_EMAIL`,
      `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
      `DAILY_API_KEY`, `NEXT_PUBLIC_DAILY_DOMAIN`,
      `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`,
      `NEXT_PUBLIC_SITE_URL`
- [ ] **Supabase Auth → URL Configuration**: production domain in `Site URL` and the redirect-URLs allow-list
- [ ] **Resend**: sending domain verified (DNS records green), `FROM_EMAIL` uses your domain (not `noreply@resend.dev`)

---

## Section 1 — Auth + onboarding (15 min)

Use a fresh email you control. Real one — magic links/confirmations
need to actually arrive.

- [ ] **Sign up** with email + password on `/sign-up` → confirmation email arrives within 30s
- [ ] Confirmation link lands back on the app and signs you in
- [ ] **Onboarding** flow renders → set name, interests, complete → lands on `/`
- [ ] Topbar shows your name + initials avatar
- [ ] **Sign out** via topbar dropdown → lands on `/sign-in`, cookies cleared
- [ ] **Sign in** again with the same creds → goes back to `/`
- [ ] **Reset password** flow from `/sign-in` → email arrives, link opens password form, new password works
- [ ] **Sign in from another browser** (incognito) with the new password
- [ ] (Optional) OAuth / magic-link providers if enabled

---

## Section 2 — Profile, settings, account delete (10 min)

- [ ] `/dashboard/settings` → Profile tab shows name in view mode, Edit toggle works
- [ ] **Upload avatar** (JPEG ~1 MB) → topbar avatar updates within 1s
- [ ] Upload a 6 MB image → rejected with "Max 5 MB"
- [ ] Upload a `.gif` → rejected with "JPEG, PNG, or WebP"
- [ ] **Remove avatar** → falls back to initials
- [ ] **Change password** → requires current password, then new + confirm; wrong current pw shows error; correct one rotates successfully and confirmation email arrives
- [ ] **Activate a licence key** (use a real one created via /admin/licences) → upgrades to Pro
- [ ] **Delete account** flow (use the test account, NOT yours): type email to confirm → account deleted, signed out, sign-in with same email = 401
- [ ] Re-sign-up with same email → fresh state (no leaked progress/data)

---

## Section 3 — Courses + lessons (15 min)

- [ ] `/courses` lists at least one published course with cover image
- [ ] Click course → detail page loads with modules + lessons
- [ ] **Free user**: clicking a Pro lesson shows the "Subscribe to unlock" wall
- [ ] **Pro user**: lesson plays (YouTube embed loads, no `?` placeholder)
- [ ] Mark a lesson complete → next lesson auto-advances, progress bar updates
- [ ] Double-click "Complete & Next" rapidly → does NOT skip 2 lessons
- [ ] Deep link `/courses/<slug>/learn?lesson=<id-from-different-course>` → falls back to first lesson of the actual course, doesn't render the foreign lesson
- [ ] Block /api/lessons/:id in DevTools → page shows lesson as locked instead of leaking the YouTube URL from client cache

---

## Section 4 — Pro purchase (real money, ~10 min)

You'll spend the actual subscription price here. Refund yourself afterward via the payment provider's admin panel.

- [ ] Free user → `/dashboard/subscription` → click Subscribe → redirected to payment provider
- [ ] Complete payment with a real card (small amount works; just need one cycle)
- [ ] Provider redirects back to the app
- [ ] Within 30s: Pro flag flips on, you can access Pro lessons
- [ ] Confirmation email arrives
- [ ] In Supabase Studio: `payments` table has the row with `status='verified'`, `pro_expires_at` set to now + 30 days
- [ ] Replay attack: in DevTools, repost `/api/payment/verify` with same `payment_id` → returns `idempotent: true`, does NOT extend expiry by another 30 days
- [ ] (optional) try the same `payment_id` from a different user → returns 409

---

## Section 5 — Live sessions (15 min)

Coordinate with yourself across two devices (or use two accounts in incognito).

- [ ] **Admin** creates a slot starting in ~10 min on `/admin/sessions/new`
- [ ] **Student** sees it on `/dashboard/sessions`, books it
- [ ] Confirmation email arrives **with `.ics` attachment**
- [ ] Open the `.ics` in your calendar app — event appears with correct title + time
- [ ] At T-5min, student can join the room
- [ ] Daily iframe loads with `?t=<token>` in the URL (not `?userName=`)
- [ ] Admin joins → both video + audio work
- [ ] Admin click **Mark Started** → student gets a "session_live" notification + toast
- [ ] After session ends (or admin cancels), check `session_bookings.no_show_at` for any participant who didn't appear
- [ ] **Cancel** flow: admin cancels slot → student gets cancel email + in-app notification
- [ ] **Update** flow: admin reschedules a different slot → student gets updated email + new ICS with `SEQUENCE:1` (opens in calendar as a replacement, not a duplicate)
- [ ] **Feedback**: after a past session, student submits 4-star rating → cannot submit again
- [ ] **Cap**: book 2 sessions in current month, try to book a 3rd → blocked with "Monthly session cap reached"

---

## Section 6 — Community / chat / DMs (15 min)

- [ ] `/dashboard/community` loads, sidebar shows channels you have access to
- [ ] Send a message in general → appears immediately for you (optimistic) + for another user in a second tab
- [ ] **@-mention** a user → mention typeahead opens, picking the user inserts `@Name`, they receive an in-app notification + push (if subscribed)
- [ ] **Reply** to a message → opens thread, reply appears, parent shows reply count
- [ ] **React** to a message → reaction appears for both sides
- [ ] **Pin** a message (as admin or author) → appears in pinned panel
- [ ] **Edit** your own message → "(edited)" shows
- [ ] **Delete** your own message → soft-deleted, replaced with placeholder
- [ ] **Mute a channel** → notifications stop firing for messages there
- [ ] **Start a DM** with another user via the compose panel → channel created, message lands, sidebar shows the new thread
- [ ] DM partner sees their photo in the DM list (not initials, not "?")
- [ ] Free user trying to DM another free user → blocked with "Direct messages are a Pro benefit"
- [ ] **Switch channels rapidly** (A → B before A loads) → channel B's messages appear, no flash of A's content

---

## Section 7 — Notifications + push (10 min)

- [ ] Click the bell icon → unread notifications panel renders
- [ ] Click an unread item → counter drops by exactly 1, link navigates to the target
- [ ] **Push toggle** in /dashboard/settings → ON → browser permission prompt appears → grant
- [ ] Trigger a DM to yourself from another account → push notification appears on the OS level
- [ ] Click the push → opens the app to the right destination
- [ ] Toggle push OFF → next trigger does NOT produce a push
- [ ] Toggle ON → OFF mid-flow (server fails mock) → state stays consistent, no orphan subscription

---

## Section 8 — Admin operations (15 min)

- [ ] `/admin` loads with stats populated (not stuck on skeletons)
- [ ] Create a course on `/admin/courses/new` → cover image uploads (try a 4 MB JPEG, try a 6 MB one → rejected)
- [ ] Add modules + lessons → resync trigger updates `courses.total_lessons` and `duration_hours`
- [ ] Publish course → Pro users get a "new_course" notification
- [ ] `/admin/students` lists students with their avatars
- [ ] `/admin/licences` → generate a key → activate as another user → it works
- [ ] `/admin/referrals` shows the referral history (test by signing up another user with a referral code)
- [ ] `/admin/settings` Profile → upload avatar as admin → appears in admin topbar + in any chat messages you posted
- [ ] (placeholder tabs Notifications, Platform, Security all show coming-soon copy — no fake save buttons)

---

## Section 9 — Security holes shouldn't reopen (5 min)

Quick privilege-escalation re-tests from DevTools console as a regular student account. ALL should fail.

- [ ] `await supabase.from('users').update({ role: 'admin' }).eq('id', myId)` → `permission denied for column "role"`
- [ ] `await supabase.from('enrollments').update({ progress: 100 }).eq('user_id', myId)` → `permission denied for column "progress"`
- [ ] `await supabase.from('referrals').update({ status: 'rewarded' }).eq('referrer_id', myId)` → `permission denied`
- [ ] `await supabase.from('licence_keys').select('key').eq('status', 'created')` → empty or permission error
- [ ] `await supabase.rpc('delete_user_account', { p_user_id: 'someone-elses-uuid' })` → `caller mismatch` error
- [ ] `await supabase.rpc('set_push_config', { p_url: 'http://evil.com', p_secret: 'x' })` → permission denied (function REVOKEd from PUBLIC)
- [ ] `curl https://yourdomain.com/api/cron/daily-emails` (no headers) → 401
- [ ] Paste `http://169.254.169.254/latest/meta-data` into a chat → no preview, no metadata leak

---

## Section 10 — Cron + monitoring (after first 24h)

These can only be verified once the app has been live for a full cycle.

- [ ] Vercel cron fired at the scheduled time → check `cron_logs` table for a `daily-emails` row with `ok = true`
- [ ] If `ok = false`, the admin-alert email arrived to `ADMIN_ALERT_EMAIL`
- [ ] Uptime monitor (UptimeRobot / Better Uptime) shows `/api/health` 100% in the last 24h
- [ ] Error monitor (Sentry / Highlight) shows zero unhandled exceptions OR each one is triaged

---

## Failure protocol

If anything in Sections 0–9 fails:

1. **Don't launch.** Fix the underlying issue, redeploy, mark every checked-off item from this section as TODO again, re-run the section.
2. If it's a flake (network timeout, third-party hiccup), re-run the single item before declaring a fix needed.
3. Log every blocker in a section at the bottom of this file with the date + resolution.

## Rollback plan

`main` deploys directly to production. To roll back:

1. Vercel dashboard → Deployments → find the last good build → "Promote to Production"
2. If a DB migration is the cause: apply a compensating migration via the Supabase MCP (the same way the audit migrations were applied). Don't try to "undo" by editing `storage.objects` / RLS manually.
3. Notify users via the admin announcement channel if customer-facing data was affected.

---

## Sign-off

When every box above is checked: launch.

`____________` (Signature / date)
