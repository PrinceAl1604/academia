import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <div className="p-8">
        <Link href="/" className="inline-block">
          <img src="/logo-wordmark.svg" alt="Educator" className="h-6" />
        </Link>
      </div>
      <div className="mx-auto max-w-2xl px-4 pb-20">
        <h1 className="text-3xl font-bold text-neutral-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-neutral-500">Last updated: March 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-700">
          <section>
            <h2 className="text-lg font-semibold text-neutral-900">1. Acceptance of Terms</h2>
            <p className="mt-2">By using Educator, you agree to these terms. If you do not agree, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">2. Account</h2>
            <p className="mt-2">You are responsible for maintaining the security of your account. Each account is personal and should not be shared.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">3. Licence Keys</h2>
            <p className="mt-2">Licence keys are single-use and tied to one account. Keys are valid for 30 days from the date of activation. Sharing or reselling keys is prohibited.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">4. Content</h2>
            <p className="mt-2">All course content is owned by Educator. You may not reproduce, distribute, or share course materials without written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">5. Refunds</h2>
            <p className="mt-2">Refund requests are handled on a case-by-case basis. Contact support within 7 days of purchase for refund inquiries.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-neutral-900">6. Termination</h2>
            <p className="mt-2">We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>
        </div>

        <div className="mt-12 border-t pt-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">← Back to courses</Link>
        </div>
      </div>
    </div>
  );
}
