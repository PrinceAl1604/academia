import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

    // Check if user needs onboarding
    let finalRedirect = redirectTo;
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("has_onboarded")
        .eq("id", user.id)
        .single();

      if (profile && profile.has_onboarded === false) {
        finalRedirect = "/onboarding";
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
