# Visible — Email Broadcasts & Newsletters Plan

> **Status:** planning · **Owner:** Alex · **Last updated:** 2026-06-19
>
> Adds **admin-sent broadcasts / newsletters** — one-off emails to all members or a
> segment, sent now or scheduled. Drip sequences and expanded event-triggered emails are
> **separate future tracks** (not in this plan).

---

## 1. What already exists (reuse)

- **Resend** integrated via `src/lib/email.ts` (`RESEND_API_KEY`, `FROM_EMAIL`, `ADMIN_ALERT_EMAIL`).
- **Transactional emails** already sending: welcome, course completion, new-course, password
  changed, session booking/cancel/reminders.
- **Daily cron** `/api/cron/daily-emails` (Vercel cron) — proves scheduled sending works.

This feature adds an **admin layer + a sending engine** on top of that foundation.

---

## 2. Scope

**In scope:** compose a broadcast (subject + body), choose an audience, send now or schedule,
unsubscribe handling + suppression, a send log, and basic per-broadcast stats.

**Out of scope (future):** drip/automation sequences, expanded event-triggered emails,
A/B testing, drag-and-drop email builder, WhatsApp broadcasts.

---

## 3. Roles

| Role | Can |
| :--- | :--- |
| **Admin** | Compose, preview, test-send, segment, send now or schedule, edit/cancel scheduled, view stats |
| **Member** | Receive broadcasts; **unsubscribe** from broadcasts (transactional emails always still sent) |

---

## 4. Data model (new, `community_id`-scoped)

- **`broadcasts`** — `id, community_id, subject, body_md, status` (`draft`|`scheduled`|`sending`|`sent`|`failed`)`,
  audience (jsonb segment def), scheduled_at, sent_at, created_by, counts (recipients, sent, failed, opened, clicked)`.
- **`broadcast_sends`** (log) — `id, broadcast_id, user_id, email, status, resend_id, opened_at, clicked_at, error`.
- **`email_preferences`** (suppression) — `user_id, email, broadcasts_opt_out (bool), unsubscribed_at, token`.
  Transactional email is never suppressed by this.

RLS: broadcasts admin-only; `email_preferences` self-manage (+ public unsubscribe via signed token).

---

## 5. Phases & use cases

> Format: `UC-E<phase>.<n>` — *Actor · Goal · Flow · Acceptance criteria · Edge cases*.

### Phase E1 — MVP broadcast (compose + send to all)

**Features:** admin composer (subject + markdown body, live preview, **test send**), audience =
all active members, send now via Resend (batched, server-side), unsubscribe link + suppression, send log.

**UC-E1.1 — Admin sends a newsletter to all members**
- *Flow:* Admin → Broadcasts → New → subject + markdown body → Preview → **Send now** → confirm.
- *Acceptance:* sends to all members except suppressed/unsubscribed; sending is **batched
  server-side** (never blocks the request — runs via a job/cron tick); a `broadcast_sends` row
  per recipient; status moves `draft → sending → sent`; counts update; admin sees a success summary.
- *Edge:* send is **idempotent** (a retry never double-sends a recipient); partial failures are
  logged and the broadcast ends `sent` with a failed count, not a hard crash.

**UC-E1.2 — Member receives & can unsubscribe**
- *Acceptance:* every broadcast includes a working **unsubscribe link** (signed token, no login
  needed); clicking sets `broadcasts_opt_out=true`; a confirmation page is shown; the member still
  receives transactional emails (receipts, password resets, session reminders).

**UC-E1.3 — Preview & test send before sending**
- *Acceptance:* admin can preview the rendered email and send a **test** to their own address;
  test sends never touch the real audience or the log counts.

**UC-E1.4 — Suppression respected**
- *Acceptance:* unsubscribed addresses + hard bounces are skipped automatically and counted as
  "skipped," not "sent."

### Phase E2 — Segments + scheduling

**Features:** audience segments (all · free · pro · enrolled in course X · inactive N days),
**schedule for later** (cron sends due broadcasts), edit/cancel a scheduled broadcast.

**UC-E2.1 — Target a segment**
- *Acceptance:* admin picks a segment; the recipient count previews before sending; only matching
  members receive it; segment definition is stored on the broadcast.

**UC-E2.2 — Schedule a broadcast**
- *Acceptance:* admin sets a future date/time; status = `scheduled`; it appears in a scheduled list;
  timezone is explicit.

**UC-E2.3 — Cron sends due broadcasts reliably**
- *Acceptance:* the cron picks up broadcasts whose `scheduled_at <= now` and `status=scheduled`,
  sends them, and is **idempotent** (a second cron tick never re-sends).

**UC-E2.4 — Edit / cancel a scheduled broadcast**
- *Acceptance:* admin can edit or cancel any `scheduled` broadcast before it sends; once `sending`/`sent`
  it's locked (read-only).

### Phase E3 — Stats & deliverability

**Features:** opens/clicks/bounces via **Resend webhooks**, a per-broadcast dashboard,
bounce/complaint auto-suppression, a pre-send deliverability guard.

**UC-E3.1 — View broadcast performance**
- *Acceptance:* per broadcast, admin sees sent / delivered / opened / clicked / bounced; updates as
  Resend webhooks arrive.

**UC-E3.2 — Bounces & complaints auto-suppressed**
- *Acceptance:* a hard bounce or spam complaint adds the address to suppression so future broadcasts skip it.

**UC-E3.3 — Pre-send deliverability guard**
- *Acceptance:* before a large send, the UI warns if the sending domain isn't verified or if the
  send would exceed Resend rate/volume limits.

---

## 6. Cross-cutting concerns

- **Compliance (important):** every broadcast carries an unsubscribe link + sender identity;
  marketing (broadcast) consent is separate from transactional email; respect opt-outs globally.
- **Deliverability:** verified `FROM` domain (on the launch checklist), batch + throttle to Resend
  limits, include a plain-text alternative.
- **Performance / scale:** sending runs in batches via the cron/queue — never inside a page request;
  the `broadcast_sends` log makes every send idempotent (no double-emails).
- **i18n:** composer is admin-facing (FR/EN UI); optionally send in the member's known language later.
- **Cost:** Resend bills per email — keep an eye on volume as the list grows.

## 7. Channel note

For the West-African member base, **WhatsApp broadcasts often out-perform email**; email is
strongest for the diaspora and formal comms. This plan is email-only — a WhatsApp broadcast track
could complement it later.

## 8. Open decisions (defaults proposed)

1. **Body editor:** markdown (recommended — lightweight, reuses the renderer from the community plan) vs a rich HTML builder (heavier). → default **markdown**.
2. **Segments at launch:** E1 = all members only; which segments matter most for E2 (free / pro / by course / inactive)?
3. **Open/click tracking:** on (more insight) vs off (more privacy). → default **on, with a clear unsubscribe**.
4. **Sender:** confirm `FROM` + a reply-to address members can answer.
