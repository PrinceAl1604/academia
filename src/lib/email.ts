import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.FROM_EMAIL || "Brightroots <noreply@resend.dev>";
const APP_NAME = "Brightroots";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app";
const HELP_EMAIL = "support@brightroots.com";

/* ─── Shared email wrapper ────────────────────────────────────
 * Postmates-inspired layout: logo  heading  divider  body  dark footer
 * ──────────────────────────────────────────────────────────── */
function emailWrapper({
  heading,
  body,
  buttonLabel,
  buttonUrl,
  footnote,
}: {
  heading: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
  footnote?: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5; padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">

        <!-- White card -->
        <tr><td style="background:#ffffff; border-radius:12px; overflow:hidden;">
          <table width="100%" cellpadding="0" cellspacing="0">

            <!-- Logo (text-based — SVG not supported in email clients) -->
            <tr><td style="padding:32px 36px 0;">
              <p style="margin:0; font-size:22px; font-weight:700; color:#171717; letter-spacing:-0.3px;">${APP_NAME}</p>
            </td></tr>

            <!-- Heading -->
            <tr><td style="padding:28px 36px 0;">
              <h1 style="margin:0; font-size:28px; font-weight:700; color:#171717; line-height:1.2;">
                ${heading}
              </h1>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:24px 36px 0;">
              <div style="height:1px; background:#e5e5e5;"></div>
            </td></tr>

            <!-- Body -->
            <tr><td style="padding:24px 36px 0;">
              ${body}
            </td></tr>

            <!-- Button -->
            ${
              buttonLabel && buttonUrl
                ? `<tr><td style="padding:28px 36px 0;">
              <a href="${buttonUrl}"
                 style="display:inline-block; background:#171717; color:#ffffff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:15px; letter-spacing:0.3px;">
                ${buttonLabel}
              </a>
            </td></tr>`
                : ""
            }

            <!-- Footnote -->
            ${
              footnote
                ? `<tr><td style="padding:24px 36px 0;">
              <p style="margin:0; font-size:13px; line-height:1.5; color:#a3a3a3;">
                ${footnote}
              </p>
            </td></tr>`
                : ""
            }

            <!-- Spacing before footer -->
            <tr><td style="height:36px;"></td></tr>

          </table>
        </td></tr>

        <!-- Dark footer -->
        <tr><td style="background:#171717; border-radius:0 0 12px 12px; padding:32px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td>
              <p style="margin:0 0 16px; font-size:18px; font-weight:700; color:#ffffff;">
                ${APP_NAME}
              </p>
              <div style="height:1px; background:#333333; margin-bottom:16px;"></div>
              <p style="margin:0; font-size:13px; color:#a3a3a3; line-height:1.5;">
                If you have any questions, we're here to help. Contact us at
                <a href="mailto:${HELP_EMAIL}" style="color:#16a34a; text-decoration:none;">${HELP_EMAIL}</a>.
              </p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ─── Welcome email ───────────────────────────────────────── */
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const firstName = name.split(" ")[0] || name;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Welcome to ${APP_NAME}, ${firstName}!`,
    html: emailWrapper({
      heading: `Welcome to ${APP_NAME}!`,
      body: `
        <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#525252;">
          Hi ${firstName},
        </p>
        <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#525252;">
          Thank you for joining ${APP_NAME}. You now have access to our free courses.
          Browse our catalog and start learning today.
        </p>
        <p style="margin:0; font-size:16px; line-height:1.6; color:#525252;">
          Want to unlock all courses? Upgrade to <strong>Pro</strong> for
          <strong>15,000 FCFA/month</strong> and get unlimited access to every
          course and downloadable resources.
        </p>`,
      buttonLabel: "Start Learning",
      buttonUrl: APP_URL,
    }),
  });
}

/* ─── Course completion email ─────────────────────────────── */
export async function sendCourseCompletionEmail({
  to,
  name,
  courseTitle,
  courseSlug,
}: {
  to: string;
  name: string;
  courseTitle: string;
  courseSlug: string;
}) {
  const firstName = name.split(" ")[0] || name;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Congratulations! You completed "${courseTitle}"`,
    html: emailWrapper({
      heading: `Congratulations, ${firstName}!`,
      body: `
        <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#525252;">
          You've completed <strong>${courseTitle}</strong>.
          Your dedication to learning is inspiring.
        </p>
        <p style="margin:0; font-size:16px; line-height:1.6; color:#525252;">
          Keep the momentum going — explore more courses in our catalog.
        </p>`,
      buttonLabel: "View My Courses",
      buttonUrl: `${APP_URL}/dashboard/courses`,
    }),
  });
}

/* ─── Subscription confirmation email ─────────────────────── */
export async function sendSubscriptionEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const firstName = name.split(" ")[0] || name;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You're now a Pro member!`,
    html: emailWrapper({
      heading: `Welcome to Pro, ${firstName}!`,
      body: `
        <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#525252;">
          Your Pro membership is now active. You have unlimited access to:
        </p>
        <ul style="margin:0; padding-left:20px; font-size:16px; line-height:2; color:#525252;">
          <li>All premium courses</li>
          <li>Downloadable resources</li>
          <li>Exclusive learning materials</li>
          <li>Priority support</li>
        </ul>`,
      buttonLabel: "Browse All Courses",
      buttonUrl: APP_URL,
    }),
  });
}

/* ─── Renewal reminder email ──────────────────────────────── */
export async function sendRenewalReminderEmail({
  to,
  name,
  daysLeft,
}: {
  to: string;
  name: string;
  daysLeft: number;
}) {
  const firstName = name.split(" ")[0] || name;
  const plural = daysLeft !== 1 ? "s" : "";

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Pro plan expires in ${daysLeft} day${plural}`,
    html: emailWrapper({
      heading: `Your subscription\nexpires soon`,
      body: `
        <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#525252;">
          Hi ${firstName},
        </p>
        <p style="margin:0 0 8px; font-size:16px; line-height:1.6; color:#171717;">
          Your Pro plan is active through
        </p>
        <p style="margin:0 0 16px; font-size:28px; font-weight:700; color:#171717;">
          ${daysLeft} day${plural} remaining
        </p>
        <p style="margin:0; font-size:15px; line-height:1.6; color:#a3a3a3;">
          If you don't renew, your account will switch to the Free plan and
          you'll lose access to premium courses.
        </p>`,
      buttonLabel: "Renew Pro",
      buttonUrl: "https://jwxfcqrf.mychariow.shop/prd_o6clpf/checkout",
    }),
  });
}
