import { Logo } from "@/components/shared/logo";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="p-8">
        <Link href="/" className="inline-block">
          <Logo className="h-6" />
        </Link>
      </div>
      <div className="mx-auto max-w-2xl px-4 pb-20">
        <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p className="mt-2">We collect information you provide when creating an account (name, email address) and usage data such as course progress and lesson completions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <p className="mt-2">Your information is used to provide access to courses, track your learning progress, send important notifications, and improve our platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Data Storage</h2>
            <p className="mt-2">Your data is stored securely using Supabase (PostgreSQL) with encryption at rest. We do not sell or share your personal information with third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Payments</h2>
            <p className="mt-2">Payments are processed through Chariow. We do not store your payment information. All transactions are handled securely by our payment partner.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
            <p className="mt-2">You can request access to, modification of, or deletion of your personal data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
            <p className="mt-2">For any privacy-related questions, contact us at the email provided in the Help section of the app.</p>
          </section>
        </div>

        <div className="mt-12 border-t pt-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to courses</Link>
        </div>
      </div>
    </div>
  );
}
