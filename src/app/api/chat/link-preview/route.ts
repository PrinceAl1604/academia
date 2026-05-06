import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase-server";

/* ─── Config ────────────────────────────────────────────────── */

const FETCH_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 512 * 1024; // 512 KiB — enough for <head>, rejects big HTML
const CACHE_TTL_DAYS = 7;
// Only follow up to this many redirects. Most legit sites chain 1–2;
// anything deeper is usually a tracking funnel or a loop.
const MAX_REDIRECTS = 3;
// Mimic a common browser so sites that gate OG metadata behind UA checks
// (Twitter/X in particular) still return something useful.
const USER_AGENT =
  "Mozilla/5.0 (compatible; AcademiaLinkPreview/1.0; +https://academia.example)";

/* ─── SSRF guards ───────────────────────────────────────────── */

/**
 * Reject hostnames that resolve to private / link-local / loopback IP
 * ranges, plus literal `localhost` and zero addresses. This is a first
 * line of defense — a determined attacker could still use DNS rebinding,
 * but that requires server-side DNS pinning (out of scope here).
 */
function isPrivateHost(hostname: string): boolean {
  let h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "::" || h === "::1") {
    return true;
  }
  // URL.hostname strips brackets but lowercases [::ffff:127.0.0.1] →
  // "::ffff:127.0.0.1". An IPv4-mapped IPv6 literal is the standard
  // way to spell an IPv4 address inside an IPv6 socket — it routes
  // identically to the bare IPv4. Without unwrapping, an attacker
  // could submit https://[::ffff:169.254.169.254]/latest/meta-data
  // and bypass the IPv4 private-range check below.
  const mapped = h.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) h = mapped[1];

  // IPv4 literals
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    // 10.0.0.0/8
    if (a === 10) return true;
    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (link-local — AWS metadata is 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    // 0.0.0.0/8
    if (a === 0) return true;
  }
  // IPv6 private ranges — coarse match on common prefixes
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 ULA
  if (h.startsWith("fe80:")) return true; // link-local
  return false;
}

/**
 * Validate a user-supplied URL: must parse, must be http(s), must not
 * point at a private network. Returns the parsed URL on success or null.
 */
function sanitizeUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (isPrivateHost(u.hostname)) return null;
  return u;
}

/* ─── HTML OG-tag extraction ───────────────────────────────── */

/**
 * Pull a meta tag's content by matching either ordering of attributes
 * (`<meta property="og:title" content="…">` or `<meta content="…"
 * property="og:title">`) — both are valid HTML and appear in the wild.
 */
function extractMeta(html: string, nameOrProperty: string): string | null {
  const esc = nameOrProperty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // content-after pattern
  const pat1 = new RegExp(
    `<meta[^>]*?(?:property|name)=["']${esc}["'][^>]*?content=["']([^"']*)["']`,
    "i"
  );
  // content-before pattern
  const pat2 = new RegExp(
    `<meta[^>]*?content=["']([^"']*)["'][^>]*?(?:property|name)=["']${esc}["']`,
    "i"
  );
  const m = pat1.exec(html) || pat2.exec(html);
  return m ? decodeEntities(m[1]) : null;
}

/**
 * Decode the handful of HTML entities that commonly show up in meta tag
 * content. We're only reading `content` attrs, not arbitrary HTML, so a
 * full entity table is overkill — this covers 99%.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractTitleTag(html: string): string | null {
  const m = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1].trim()) : null;
}

/**
 * Resolve `<img src="/foo.png">` style paths against the page URL so
 * the client can render the image directly. og:image is usually
 * absolute already, but not always.
 */
function resolveUrl(maybeUrl: string, base: URL): string | null {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
}

interface ExtractedPreview {
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

function extractOgData(html: string, pageUrl: URL): ExtractedPreview {
  // Only scan the first ~128 KiB — OG tags are always in <head>, scanning
  // further just costs CPU.
  const head = html.slice(0, 131_072);

  const title =
    extractMeta(head, "og:title") ||
    extractMeta(head, "twitter:title") ||
    extractTitleTag(head);

  const description =
    extractMeta(head, "og:description") ||
    extractMeta(head, "twitter:description") ||
    extractMeta(head, "description");

  const rawImage =
    extractMeta(head, "og:image") ||
    extractMeta(head, "og:image:url") ||
    extractMeta(head, "twitter:image");
  const image_url = rawImage ? resolveUrl(rawImage, pageUrl) : null;

  const site_name =
    extractMeta(head, "og:site_name") || pageUrl.hostname.replace(/^www\./, "");

  return {
    title: title ? title.slice(0, 200) : null,
    description: description ? description.slice(0, 400) : null,
    image_url,
    site_name: site_name ? site_name.slice(0, 100) : null,
  };
}

/* ─── Fetch with body cap + timeout ────────────────────────── */

async function fetchWithCap(initialUrl: URL): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    // Manual redirect handling — `redirect: "follow"` would let fetch
    // walk the chain autonomously, with two problems:
    //   1. MAX_REDIRECTS isn't enforced — Node's default cap is 20+,
    //      plenty of room for tracking funnels and loops.
    //   2. Intermediate hops to private hosts (link-local, RFC1918,
    //      AWS metadata at 169.254.169.254) get hit before we have a
    //      chance to validate. Even though we never return their
    //      bodies, the GET itself reaches an internal target.
    // So we walk the chain ourselves, validating every Location.
    let currentUrl = initialUrl;
    let res: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      res = await fetch(currentUrl.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": USER_AGENT,
          // Accept HTML — if the server returns JSON/binary we'll bail
          // on the content-type check below.
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      // Not a redirect → done walking, drop through to body read.
      // 301/302/303/307/308 all carry a Location header per RFC 7231 §6.4.
      const isRedirect =
        res.status === 301 ||
        res.status === 302 ||
        res.status === 303 ||
        res.status === 307 ||
        res.status === 308;
      if (!isRedirect) break;

      // Hit the cap — abort instead of following one more step.
      if (hop === MAX_REDIRECTS) return null;

      const location = res.headers.get("location");
      if (!location) return null;

      // Location may be relative ("/path") or absolute. Resolve against
      // the current URL, then re-validate through sanitizeUrl so http(s)
      // and isPrivateHost() apply to the next hop.
      let next: URL;
      try {
        next = new URL(location, currentUrl);
      } catch {
        return null;
      }
      const safe = sanitizeUrl(next.toString());
      if (!safe) return null;
      currentUrl = safe;
    }

    if (!res || !res.ok) return null;

    // Belt & suspenders: the final URL must also be public. (We
    // validated each Location above, but a same-origin server-side
    // redirect via internal mechanisms would still surface here.)
    if (isPrivateHost(currentUrl.hostname)) return null;

    const ct = res.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("html")) return null;

    // Read with a byte cap so a multi-GB response can't OOM the server.
    const reader = res.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder("utf-8", { fatal: false });
    let total = 0;
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        // Stop reading; we probably have enough of <head> already.
        reader.cancel().catch(() => {});
        break;
      }
      out += decoder.decode(value, { stream: true });
      // Quick exit: if we already passed </head>, we have everything we need.
      if (out.includes("</head>")) {
        reader.cancel().catch(() => {});
        break;
      }
    }
    return out;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/* ─── Route handler ────────────────────────────────────────── */

interface CachedPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  status: "ok" | "error" | "blocked";
  fetched_at: string;
}

/**
 * POST /api/chat/link-preview
 * Body: { url: string }
 *
 * Returns a cached OG preview for the URL, fetching + storing it if we
 * don't already have a fresh entry. Requires authentication so the
 * cache population can't be driven by anonymous internet traffic.
 */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (typeof body.url !== "string") {
    return NextResponse.json({ error: "missing_url" }, { status: 400 });
  }

  const parsed = sanitizeUrl(body.url);
  if (!parsed) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }
  const url = parsed.toString();

  // Check the cache. Even an "error" entry short-circuits a retry inside
  // the TTL window — if youtube.com/nope404 failed once, it'll keep
  // failing for the next 7 days.
  const { data: cached } = await supabase
    .from("link_previews")
    .select("*")
    .eq("url", url)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    const ttl = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
    if (age < ttl) {
      return NextResponse.json({ preview: cached as CachedPreview });
    }
  }

  // Cache miss or stale — fetch fresh.
  const html = await fetchWithCap(parsed);
  const admin = getSupabaseAdmin();

  if (!html) {
    const row = {
      url,
      title: null,
      description: null,
      image_url: null,
      site_name: parsed.hostname.replace(/^www\./, ""),
      status: "error" as const,
      fetched_at: new Date().toISOString(),
    };
    await admin.from("link_previews").upsert(row, { onConflict: "url" });
    return NextResponse.json({ preview: row });
  }

  const og = extractOgData(html, parsed);
  const row = {
    url,
    ...og,
    status: "ok" as const,
    fetched_at: new Date().toISOString(),
  };
  await admin.from("link_previews").upsert(row, { onConflict: "url" });
  return NextResponse.json({ preview: row });
}

// Disable static generation — this route always needs to run on demand.
export const dynamic = "force-dynamic";
