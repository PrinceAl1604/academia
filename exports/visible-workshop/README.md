# Waitlist page → `visible-workshop`

A standalone, static port of the academia `/liste` waitlist page, built to drop
straight into the **visible-workshop** repo. It matches that site's
`STYLE_GUIDE.md` (cream substrate, white cards, dark hairlines, deep-teal accent,
Garamond italic) and reuses its existing assets, so there's nothing new to design.

## Install (in the `visible-workshop` repo)

The waitlist becomes the **homepage** (`workshop-visible.com`), and the current
workshop sales page is moved to a path and left **unlinked** (reachable only by
direct URL):

1. Rename the existing sales page `index.html` → `workshop.html`.
   With `"cleanUrls": true` it serves at **`/workshop`** — unlinked, so it's
   effectively hidden. (Pick a less guessable name if you want it harder to find.)
2. Add this **`index.html`** (the waitlist) at the **repo root** → served at
   **`workshop-visible.com`**.
3. No other files needed — the page reuses assets already in the repo:
   `logo.svg`, `favicon.svg`, `alex-prof.jpg`, and `logos/*.svg`.
   (Optional: add an `og-cover.jpg` for nicer social previews.)

The waitlist does **not** link to the sales page (the nav CTA scrolls to the
form; the footer "Le workshop" link was removed), so the sale stays out of sight.

That's it. The page is one self-contained file: inline CSS + inline JS, one
Google webfont (EB Garamond italic), zero build step.

## The one config knob

Near the top of the `<script>` in `liste.html`:

```js
var API_BASE = "https://app.workshop-visible.com";
```

Point it at the **academia app origin** (no trailing slash). The form POSTs to
`API_BASE/api/waitlist`, which is the product backend that already owns:

- the `waitlist` Supabase table (upsert on email),
- per-email rate limiting,
- the **welcome email + Brand Blueprint gift** (Resend),
- the WhatsApp community link shown on success (after the patch below).

So a signup from the static page behaves identically to a signup on the app —
no duplicated backend, no second email system.

## Backend requirement — apply the included patch

For the cross-origin POST to work, `academia/src/app/api/waitlist/route.ts` must:

- answer the CORS preflight (`OPTIONS`) and set `Access-Control-Allow-Origin`
  for allow-listed origins, and
- return `{ ok: true, whatsapp_url }` so the page can show the WhatsApp button.

That change is provided here as **`academia-waitlist-cors.patch`**. It ships as a
patch (not pre-applied) because this session's deliverables are committed to a
branch that does **not** contain `src/app/api/waitlist/route.ts` — the waitlist
feature lives on its own branch/PR. Apply the patch on the branch/PR that owns
the route, then ship it:

```sh
# from the academia repo, on the branch/PR that contains src/app/api/waitlist/route.ts
git apply path/to/academia-waitlist-cors.patch
```

The current (unpatched) route returns `{ ok: true }` and sends **no** CORS
headers, so the cross-origin form is blocked by the browser until the patch
ships. After the patch it returns `{ ok: true, whatsapp_url }` with the CORS
headers; the page handles a missing `whatsapp_url` gracefully (it just shows no
WhatsApp button).

Allowed origins are `workshop-visible.com`, `www.workshop-visible.com`, and
`visible-workshop.vercel.app`, plus anything in the `WAITLIST_ALLOWED_ORIGINS`
env (comma-separated). Add your final domain — or any Vercel preview origin you
want to test from — there.

**The cross-origin POST works once that patched route is deployed.** Until then,
point `API_BASE` at a deployed academia preview/app that includes it, or the
browser will block the request.

## Why a separate file (not a direct copy)

academia is a Next.js app (server components, `next/image`, Supabase reads at
request time). visible-workshop is a single static HTML file. The page was
re-authored as static HTML so it needs no Node/Next runtime — the form is the
only dynamic part, and it talks to academia over HTTPS.
