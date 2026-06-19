# Visible — Community Platform Plan (Circle-style)

> **Status:** planning · **Owner:** Alex · **Last updated:** 2026-06-19
>
> Turns the Visible course app into a **Circle-style community hub**. Conversation
> (feed, chat, DMs, Q&A) lives in a **WhatsApp community** for now — the app is the
> *structured hub*: welcome, courses, events, members, search, branding.

---

## 1. Vision & scope

- **Now:** one community (yours), served on `app.workshop-visible.com`.
- **Later (SaaS):** many owners run their own communities. The schema is
  **multi-tenant-ready from day one** (a `communities` table + `community_id` on
  every new table; exactly one active community for now). No tenant signup/billing yet.
- **Communication = WhatsApp** for now (feed, chat, DMs). Surfaced in-app as links +
  CTAs, **not** built natively.

**In scope (this plan):** Spaces & Space Groups · Welcome page · Members directory &
profiles · Events & calendar · Customization/branding · Search · remove the admin Explorer.

**Out of scope for now (future phases):** in-app posts/feed, chat/DMs, gamification &
leaderboard, granular per-space "access groups", branded native mobile app, moderation tools.

---

## 2. Roles (actors)

| Role | Who | Sees |
| :--- | :--- | :--- |
| **Owner/Admin** | You | Everything; manages spaces, content, events, branding, members |
| **Pro member** | Member with active Pro (`subscription_tier='pro'`) | `public` + `members` + `pro` spaces |
| **Member** | Registered, logged-in (free) | `public` + `members` spaces |
| **Visitor** | Logged-out | `public` spaces only (marketing landing lives on the other domain) |

---

## 3. Guardrails & conventions

- **Multi-tenant-ready**, single active community now.
- **Server-first rendering** for all new pages (perf on mobile / slow West-African networks).
- **Shipped per phase** as independent PRs → Vercel preview → you merge.
- **Bilingual** (FR default, EN) via existing `src/lib/i18n/translations.ts` + `useLanguage()`.
- **Reuse the design system** (`DESIGN_SYSTEM.md`, shadcn, Tailwind tokens) — no new look.
- **Space access tiers:** `public` | `members` | `pro` — our lightweight paywall until SaaS access-groups.

---

## 4. Data model (new + extended)

**New tables** (all carry `community_id`):

- **`communities`** — `id, name, slug, logo_url, brand_color, custom_css, whatsapp_url,
  welcome_space_id, created_at, updated_at`. One seeded row.
- **`space_groups`** — `id, community_id, name, emoji, sort_order, visibility`.
  (e.g. Welcome · Community · Classroom · Events · Links)
- **`spaces`** — `id, community_id, group_id, name, slug, emoji, type, access, sort_order,
  config (jsonb), created_at, updated_at`.
  - `type`: `page` | `course` | `event` | `link` (later: `post`, `chat`)
  - `access`: `public` | `members` | `pro`
  - `config` per type: `page → {content_md, cover_url, video_url}` ·
    `course → {course_id | category_id}` · `event → {filter}` · `link → {url, open_in_new}`

**Extended tables:**

- **`users`** (profiles) — add `bio, headline, location, socials (jsonb), profile_visibility`.
- **`session_slots`** (events) — add `space_id, cover_url, location_type` (`online`|`in_person`);
  RSVP reuses `session_bookings`; paywall inherits the parent space's `access`.

**RLS:** spaces/groups readable per `access` tier; profiles readable per `profile_visibility`;
all writes admin-only. Everything filtered by `community_id`.

---

## 5. Phase overview

| Phase | Theme | Key features | PR(s) | Depends on |
| :--- | :--- | :--- | :--- | :--- |
| **0** | Foundation & shell | DB + multi-tenant base, Circle sidebar, top nav scaffold, remove Explorer | A0 | — |
| **1** | Spaces & Welcome | Space types (page/course/event/link), Welcome page, WhatsApp link, spaces admin | A1 | 0 |
| **2** | Members & profiles | Directory, public profiles, profile editor | B | 0 |
| **3** | Events & calendar | Extend sessions → events, RSVP, paywall, calendar, go-live | C | 1 |
| **4** | Customization | Brand color, logo, space icons, custom CSS, welcome builder | D | 1 |
| **5** | Search | Members + courses + events search | E | 1, 2, 3 |

> **Use-case format:** each is `UC-<phase>.<n>` — *Actor · Goal · Flow · Acceptance criteria · Edge cases*. Acceptance criteria are written to be directly testable.

---

## 6. Phases & use cases

### Phase 0 — Foundation & shell

**Features:** data model + RLS + seed; the Circle-style app shell (sidebar that renders
Space Groups → Spaces from the DB, top nav: Home · Members · Search · 🔔 · profile);
remove the admin Explorer; `/` (app, authed) routes to the Welcome page (stub for now).

**UC-0.1 — Render the community shell**
- *Actor:* Member · *Goal:* see the community navigation like Circle.
- *Flow:* Logs in → lands on Home → left sidebar shows Space Groups (collapsible), each
  listing its Spaces with emoji + name; top bar shows Home/Members/Search/bell/avatar.
- *Acceptance:* groups render in `sort_order`; spaces render in `sort_order`; only spaces
  the user's tier can access are listed; collapsing a group persists across reloads;
  active space is highlighted; fully usable on mobile (drawer).
- *Edge:* empty community → sidebar shows an empty state, never a crash.

**UC-0.2 — Remove the Explorer**
- *Actor:* Admin · *Goal:* the old `/admin/explorer` is gone.
- *Acceptance:* route, component, sidebar item, and i18n keys removed; any course-ordering
  it provided is preserved in the Spaces/Course admin (Phase 1); no dead links remain.

**UC-0.3 — Multi-tenant data integrity**
- *Actor:* System · *Goal:* all reads/writes are scoped to the active community.
- *Acceptance:* every new query filters by `community_id`; RLS blocks cross-community reads;
  a seed migration creates exactly one community + a default set of groups.

---

### Phase 1 — Spaces & Welcome

**Features:** the four space types render; the Welcome page (markdown + cover + video) is
the Home; a WhatsApp "Community" link-space; full admin CRUD for groups + spaces (create,
edit, reorder via drag-and-drop, delete, set emoji/access).

**UC-1.1 — Welcome page is the Home**
- *Actor:* Member · *Goal:* a "Start Here" welcome on entry.
- *Flow:* Opens `/` → sees the Welcome space: cover image, optional video embed, rich
  (markdown) body, and a **"Join the WhatsApp community"** CTA.
- *Acceptance:* content is admin-editable; markdown renders headings/bold/lists/links/video;
  CTA opens `communities.whatsapp_url` in a new tab; page is server-rendered; loads fast on 3G.
- *Edge:* no welcome content set → friendly placeholder for members, edit prompt for admin.

**UC-1.2 — Browse a Course space**
- *Actor:* Member · *Goal:* find courses inside a "Classroom" space.
- *Flow:* Clicks a `course`-type space → sees the linked course(s)/category (the current
  catalog UI, reused) → opens a course as today.
- *Acceptance:* reuses existing course cards + Pro lock; respects the space's `access`;
  no regression to the existing course/learn flow.

**UC-1.3 — Open a Link space (WhatsApp / external)**
- *Actor:* Member · *Goal:* jump to WhatsApp or an external resource.
- *Acceptance:* clicking a `link` space opens `config.url` (new tab if `open_in_new`);
  link spaces never render an internal page; an external-link icon is shown in the sidebar.

**UC-1.4 — Admin creates & organizes spaces**
- *Actor:* Admin · *Goal:* build the sidebar like the Circle screenshot.
- *Flow:* Admin → Spaces → create Space Group (name, emoji) → add Spaces (name, emoji,
  type, access, target) → drag to reorder groups and spaces → save.
- *Acceptance:* create/edit/delete groups & spaces; drag-reorder persists `sort_order`
  (reuse existing dnd-kit); choosing a type reveals only that type's config fields;
  deleting a group with spaces asks for confirmation; changes reflect immediately in the sidebar.
- *Edge:* slug collisions auto-resolved; deleting the Welcome space is blocked (it's Home).

---

### Phase 2 — Members directory & profiles

**Features:** `/members` directory; public profile pages `/members/[id]`; profile editor in settings.

**UC-2.1 — Browse the member directory**
- *Actor:* Member · *Goal:* discover other members.
- *Flow:* Top nav → Members → grid of cards (avatar, name, headline) → filter/search by name.
- *Acceptance:* server-rendered + paginated (no full-table load); respects
  `profile_visibility` (private profiles excluded); search matches name/headline;
  works on mobile.
- *Edge:* members with no avatar show initials; empty result → clear empty state.

**UC-2.2 — View a member profile**
- *Actor:* Member · *Goal:* learn about a member.
- *Acceptance:* shows avatar, name, headline, bio, location, socials, and (optional) the
  courses they're enrolled in / events attending; respects visibility; 404/blocked page for private.

**UC-2.3 — Edit my profile**
- *Actor:* Member · *Goal:* present myself.
- *Flow:* Settings → Profile → edit headline, bio, location, social links, visibility, avatar → save.
- *Acceptance:* changes persist and appear in directory/profile; avatar upload reuses the
  existing `AvatarUpload` + size/type validation; visibility `private` removes me from the directory.

---

### Phase 3 — Events & calendar

**Features:** extend live-sessions into Events (cover, attached to an Event space, RSVP,
paywalled by space access, go-live); a calendar/list view.

**UC-3.1 — Member RSVPs to an event**
- *Actor:* Member · *Goal:* reserve a spot.
- *Flow:* Opens an Event space → sees upcoming events (cover, title, date/time, host) →
  clicks **RSVP** → gets a confirmation (+ existing email).
- *Acceptance:* RSVP writes a `session_booking`; capacity + the monthly cap (currently 2)
  are enforced; duplicate RSVP prevented; cancel honors the 24h policy; timezone shown clearly.
- *Edge:* full event → "Full" + optional waitlist (future); past event → RSVP disabled.

**UC-3.2 — Paywalled event**
- *Actor:* Member vs Pro · *Goal:* gate premium events.
- *Acceptance:* an event in a `pro` space shows a "Pro required" wall to free members with a
  link to subscribe; Pro members RSVP normally; access is enforced server-side (not just hidden).

**UC-3.3 — Admin runs an event live**
- *Actor:* Admin · *Goal:* start the session.
- *Flow:* Admin creates an event (reusing the sessions form + cover + space) → at start,
  clicks **Go live** (sets `host_started_at`) → attendees see a **Join** button (Google Meet link).
- *Acceptance:* reuses existing create/edit/cancel + cascade emails + notifications; "Join"
  appears only at/after start for people who RSVP'd; cancel notifies all attendees.

**UC-3.4 — Calendar view**
- *Actor:* Member · *Goal:* see what's coming.
- *Acceptance:* month/list view of upcoming events across event spaces; click → event detail;
  respects access (pro events show a lock for free members); server-rendered.

---

### Phase 4 — Customization & branding

**Features:** replace the placeholder admin tabs with a **Branding** panel: brand color,
logo upload, community name, space icons/banners, and **custom CSS** — driven from
`communities` and injected at the layout level. (Custom domain already shipped.)

**UC-4.1 — Set brand color & logo**
- *Actor:* Admin · *Goal:* match my brand.
- *Flow:* Admin → Branding → pick a primary color + upload a logo → save → whole app reflects it.
- *Acceptance:* brand color overrides the `--primary` token live (no redeploy); logo replaces
  the wordmark in sidebar/top bar; values persist in `communities`; sensible contrast fallback.

**UC-4.2 — Custom CSS**
- *Actor:* Admin · *Goal:* fine-tune appearance.
- *Acceptance:* admin pastes CSS → injected into the app shell; scoped so it can't break the
  admin panel itself; empty = no-op; documented as advanced/at-your-own-risk.

**UC-4.3 — Space icons & banners**
- *Actor:* Admin · *Goal:* visual spaces like the screenshot.
- *Acceptance:* set an emoji (and optional banner) per space/group; shown in sidebar + space header.

**UC-4.4 — WhatsApp link config**
- *Actor:* Admin · *Goal:* manage the community link in one place.
- *Acceptance:* `whatsapp_url` set in Branding drives the Welcome CTA + the Community link-space + onboarding.

---

### Phase 5 — Search

**Features:** top-nav Search + `/search?q=` across **members + courses + events**.

**UC-5.1 — Unified search**
- *Actor:* Member · *Goal:* find anything quickly.
- *Flow:* Clicks Search (or types in the topbar) → results page grouped by **Members /
  Courses / Events** → click → go to the item.
- *Acceptance:* server-side query (Postgres trigram/ILIKE to start; FTS later); results
  respect the user's access tier + profile visibility; debounced; empty query handled;
  fast on mobile; FR/EN labels.
- *Edge:* no results → suggestions/empty state; very short query (<2 chars) → no-op.

---

## 7. Cross-cutting concerns

- **Access enforcement:** every space/event/profile check is **server-side + RLS**, never
  client-only hiding.
- **i18n:** all new strings added to `translations.ts` (FR + EN).
- **Performance:** server components + pagination; no full-table client loads; mindful of 3G.
- **Notifications:** reuse the existing bell/push for event reminders & RSVPs (no chat notifs — that's WhatsApp).
- **Analytics (light):** track space views / event RSVPs for the admin dashboard (optional, later in phase).

## 8. Out of scope now → future (SaaS & beyond)

- In-app **posts/feed**, **chat/DMs** (WhatsApp for now).
- **Gamification:** points, levels, leaderboard, badges.
- **Access groups:** granular per-space bundles tied to offers (we use `public/members/pro` for now).
- **Multi-tenant go-live:** tenant signup, per-community billing, `community_id` on legacy tables (courses/users) + backfill.
- **Branded native mobile app** (PWA could be an interim step).
- **Moderation** tooling.

## 9. Open decisions (defaults chosen — change anytime)

1. **Multi-tenant-ready schema** now — ✅ default yes.
2. **Markdown renderer** re-added for Welcome/content pages — ✅ default yes (lightweight).
3. **Course catalog becomes a Space** under "Classroom"; **Home = Welcome** — ✅ default yes.
4. **5-phase / per-PR delivery** (A0 → A1 → B → C → D → E) — ✅ default yes.
