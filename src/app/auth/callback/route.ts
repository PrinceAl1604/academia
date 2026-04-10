import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { linkReferral, ensureReferralCode } from "@/lib/referral";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect") || "/";

  if (code) {
    // Create a temporary response — we'll replace it after checking onboarding
    const tempResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              tempResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    let finalRedirect = redirectTo;
    if (user) {
      const admin = getSupabaseAdmin();
      const userName =
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "USER";

      // ── Ensure user row exists BEFORE any referral work ──────────
      // The users record is normally created client-side by loadUserProfile,
      // but referral linking needs the FK row to exist NOW.
      const { data: profile } = await admin
        .from("users")
        .select("id, has_onboarded, referral_code, referred_by")
        .eq("id", user.id)
        .single();

      if (!profile) {
        // First-time user — create their record so FK constraints pass
        await admin.from("users").insert({
          id: user.id,
          email: user.email || "",
          name: userName,
          role: "student",
          subscription_tier: "free",
          has_onboarded: false,
        });
        finalRedirect = "/onboarding";
      } else if (profile.has_onboarded === false) {
        finalRedirect = "/onboarding";
      }

      // Generate referral code if user doesn't have one yet
      if (!profile?.referral_code) {
        try {
          await ensureReferralCode(user.id, userName);
        } catch (err) {
          console.error("[Auth Callback] ensureReferralCode failed:", err);
        }
      }

      // If signed up via referral link, link the referral
      const refCode = user.user_metadata?.referral_code;
      if (refCode && !profile?.referred_by) {
        try {
          await linkReferral(user.id, refCode);
        } catch (err) {
          console.error("[Auth Callback] linkReferral failed:", err);
        }
      }
    }

    // Build final response with correct redirect and carry over cookies
    const response = NextResponse.redirect(`${origin}${finalRedirect}`);
    tempResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });

    return response;
  }

  return NextResponse.redirect(`${origin}/`);
}
