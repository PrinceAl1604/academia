# Illustrations

This folder holds unDraw SVG illustrations used across Brightroots.

## Workflow

1. Visit **https://undraw.co**
2. Find an illustration you want
3. Click the gear icon (top right) → set custom color to **`#269e5f`**
   (this is the brand forest-green, computed from `--primary` token)
4. Download the SVG
5. Rename to a clear `kebab-case` name and save it here
6. Reference it via the `<Illustration name="..." />` component:
   ```tsx
   import { Illustration } from "@/components/shared/illustration";
   <Illustration name="no-courses" alt="" size="md" />
   ```

## Naming convention

Use a `kebab-case` name that describes **what the illustration represents
in the app**, not what's depicted in the artwork:

✅ `no-courses.svg`           (used as empty state for "no enrolled courses")
✅ `welcome-onboarding.svg`   (used on first onboarding step)
✅ `auth-side-panel.svg`      (used on the sign-in/sign-up side panel)
❌ `person-with-laptop.svg`   (describes art, not usage — fragile if reused)

## Suggested set for Brightroots

These are the spots in the app that would benefit most from an
illustration. Search undraw.co for each suggested keyword:

| Filename | unDraw search term | Used in |
|---|---|---|
| `welcome-onboarding.svg` | "welcome", "starting" | onboarding step 1 |
| `interests.svg` | "tags", "selecting", "thoughts" | onboarding interests step |
| `personalized.svg` | "personalization", "graduation" | onboarding final step |
| `no-courses.svg` | "empty", "void", "no data" | dashboard empty state |
| `no-results.svg` | "search", "not found" | catalog empty state |
| `auth-illustration.svg` | "login", "secure" or "studying" | sign-in / sign-up side panel |
| `404.svg` | "404", "lost" | not-found page |
| `error.svg` | "warning", "error", "fix" | error.tsx |
| `payment-success.svg` | "celebration", "success" | payment/success |
| `subscription.svg` | "subscriber", "premium" | dashboard/subscription page hero |

You don't need all of these — start with the 3-4 most-visible ones
(onboarding + empty states + auth side panel) and grow from there.

## Why `#269e5f` specifically

Computed from your design system's `--primary` token
(`oklch(0.62 0.14 155)`) converted to sRGB hex. Using this color means
illustrations match brand CTAs / mention pills / progress bars / active
nav indicators — single visual language across the app.

If you ever change `--primary`, regenerate the hex with:

```js
node -e '
const L = 0.62, C = 0.14, H = 155 * Math.PI / 180;
const a = C * Math.cos(H), b_ = C * Math.sin(H);
const l_ = L + 0.3963377774 * a + 0.2158037573 * b_;
const m_ = L - 0.1055613458 * a - 0.0638541728 * b_;
const s_ = L - 0.0894841775 * a - 1.2914855480 * b_;
const l = l_**3, m = m_**3, s = s_**3;
let r =  4.0767416621*l - 3.3077115913*m + 0.2309699292*s;
let g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s;
let b =  -0.0041960863*l - 0.7034186147*m + 1.7076147010*s;
const srgb = v => v <= 0.0031308 ? 12.92*v : 1.055*Math.pow(v, 1/2.4) - 0.055;
[r,g,b] = [r,g,b].map(v => Math.max(0, Math.min(1, srgb(v))));
const hex = v => Math.round(v*255).toString(16).padStart(2, "0");
console.log("#" + hex(r) + hex(g) + hex(b));
'
```
