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
 * Premium template — top accent, refined card, polished footer
 * ──────────────────────────────────────────────────────────── */
function emailWrapper({
  heading,
  preheading,
  body,
  buttonLabel,
  buttonUrl,
  footnote,
}: {
  heading: string;
  preheading?: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
  footnote?: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${heading}</title>
</head>
<body style="margin:0; padding:0; background:#f0eeeb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Helvetica Neue',sans-serif; -webkit-font-smoothing:antialiased;">

  <!-- Preheader text (hidden, shows in inbox preview) -->
  ${preheading ? `<div style="display:none; max-height:0; overflow:hidden; font-size:1px; line-height:1px; color:#f0eeeb;">${preheading}</div>` : ""}

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0eeeb;">
    <tr><td style="padding:48px 16px 32px;" align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px; width:100%;">

        <!-- Logo bar -->
        <tr><td style="padding:0 0 32px;" align="center">
          <p style="margin:0; font-size:24px; font-weight:800; color:#171717; letter-spacing:-0.5px;">
            ${APP_NAME}<span style="color:#16a34a;">.</span>
          </p>
        </td></tr>

        <!-- Main card -->
        <tr><td style="background:#ffffff; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

            <!-- Green accent bar -->
            <tr><td style="height:4px; background:linear-gradient(90deg,#16a34a,#22c55e); border-radius:16px 16px 0 0;"></td></tr>

            <!-- Heading -->
            <tr><td style="padding:40px 40px 0;">
              <h1 style="margin:0; font-size:26px; font-weight:700; color:#171717; line-height:1.3; letter-spacing:-0.3px;">
                ${heading}
              </h1>
            </td></tr>

            <!-- Divider -->
            <tr><td style="padding:24px 40px 0;">
              <div style="height:1px; background:#e5e5e5;"></div>
            </td></tr>

            <!-- Body -->
            <tr><td style="padding:24px 40px 0; font-size:15px; line-height:1.7; color:#525252;">
              ${body}
            </td></tr>

            <!-- Button -->
            ${
              buttonLabel && buttonUrl
                ? `<tr><td style="padding:32px 40px 0;">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr><td style="background:#171717; border-radius:10px;">
                  <a href="${buttonUrl}"
                     style="display:inline-block; padding:14px 36px; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; letter-spacing:0.2px; line-height:1;">
                    ${buttonLabel} &rarr;
                  </a>
                </td></tr>
              </table>
            </td></tr>`
                : ""
            }

            <!-- Footnote -->
            ${
              footnote
                ? `<tr><td style="padding:24px 40px 0;">
              <p style="margin:0; font-size:13px; line-height:1.6; color:#a3a3a3;">
                ${footnote}
              </p>
            </td></tr>`
                : ""
            }

            <!-- Bottom spacing -->
            <tr><td style="height:40px;"></td></tr>

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:32px 8px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">

            <!-- Quick links -->
            <tr><td align="center" style="padding-bottom:20px;">
              <a href="${APP_URL}" style="font-size:13px; color:#737373; text-decoration:none; padding:0 12px;">Courses</a>
              <span style="color:#d4d4d4;">|</span>
              <a href="${APP_URL}/dashboard" style="font-size:13px; color:#737373; text-decoration:none; padding:0 12px;">Dashboard</a>
              <span style="color:#d4d4d4;">|</span>
              <a href="mailto:${HELP_EMAIL}" style="font-size:13px; color:#737373; text-decoration:none; padding:0 12px;">Support</a>
            </tr>

            <!-- Copyright -->
            <tr><td align="center" style="padding-bottom:8px;">
              <p style="margin:0; font-size:12px; color:#a3a3a3; line-height:1.5;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td></tr>

            <tr><td align="center">
              <p style="margin:0; font-size:12px; color:#a3a3a3; line-height:1.5;">
                Questions? Reach us at
                <a href="mailto:${HELP_EMAIL}" style="color:#16a34a; text-decoration:none;">${HELP_EMAIL}</a>
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
      heading: `Welcome aboard, ${firstName}!`,
      preheading: `You're in! Start exploring courses on ${APP_NAME}.`,
      body: `
        <p style="margin:0 0 16px;">
          Thanks for joining <strong>${APP_NAME}</strong>. Your account is ready and you can start
          browsing our free courses right away.
        </p>
        <p style="margin:0 0 16px;">
          Want the full experience? Upgrade to <strong>Pro</strong> for
          <strong>15,000 FCFA/month</strong> and unlock every course, downloadable
          resources, and priority support.
        </p>
        <p style="margin:0;">
          We're glad to have you here.
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
      heading: `Well done, ${firstName}!`,
      preheading: `You just completed "${courseTitle}" on ${APP_NAME}.`,
      body: `
        <p style="margin:0 0 20px;">
          You've successfully completed <strong>${courseTitle}</strong>.
          Your consistency is paying off.
        </p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%; margin-bottom:20px;">
          <tr>
            <td style="padding:16px 20px; background:#f0fdf4; border-radius:10px; border-left:4px solid #16a34a;">
              <p style="margin:0 0 4px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#16a34a;">Completed</p>
              <p style="margin:0; font-size:16px; font-weight:600; color:#171717;">${courseTitle}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0;">
          Keep the momentum going — explore more courses in our catalog.
        </p>`,
      buttonLabel: "Browse Courses",
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
      preheading: `Your Pro membership is active. Unlimited access unlocked.`,
      body: `
        <p style="margin:0 0 20px;">
          Your Pro membership is now active. Here's what you've unlocked:
        </p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%; margin-bottom:20px;">
          <tr>
            <td style="padding:20px; background:#fafaf9; border-radius:10px;">
              <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;">
                <tr><td style="padding:6px 0; font-size:15px; color:#525252;">
                  <span style="color:#16a34a; font-weight:600;">&#10003;</span>&nbsp;&nbsp;All premium courses
                </td></tr>
                <tr><td style="padding:6px 0; font-size:15px; color:#525252;">
                  <span style="color:#16a34a; font-weight:600;">&#10003;</span>&nbsp;&nbsp;Downloadable resources
                </td></tr>
                <tr><td style="padding:6px 0; font-size:15px; color:#525252;">
                  <span style="color:#16a34a; font-weight:600;">&#10003;</span>&nbsp;&nbsp;Exclusive learning materials
                </td></tr>
                <tr><td style="padding:6px 0; font-size:15px; color:#525252;">
                  <span style="color:#16a34a; font-weight:600;">&#10003;</span>&nbsp;&nbsp;Priority support
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:0;">
          Dive in and make the most of your subscription.
        </p>`,
      buttonLabel: "Browse All Courses",
      buttonUrl: APP_URL,
    }),
  });
}

/* ─── Referral reward email ───────────────────────────────── */
export async function sendReferralRewardEmail({
  to,
  name,
  licenceKey,
}: {
  to: string;
  name: string;
  licenceKey: string;
}) {
  const firstName = name.split(" ")[0] || name;

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your free month of Pro is here!`,
    html: emailWrapper({
      heading: `You earned a free month!`,
      preheading: `A friend subscribed through your referral. Here's your licence key.`,
      body: `
        <p style="margin:0 0 16px;">
          Hi ${firstName}, a friend you referred just subscribed to
          <strong>${APP_NAME} Pro</strong>. As a thank-you, here is your
          <strong>free 1-month licence key</strong>:
        </p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%; margin-bottom:20px;">
          <tr>
            <td align="center" style="padding:20px; background:#f0fdf4; border:2px dashed #86efac; border-radius:12px;">
              <p style="margin:0 0 6px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:#16a34a;">Your Licence Key</p>
              <p style="margin:0; font-size:24px; font-weight:700; font-family:'SF Mono','Fira Code','Courier New',monospace; color:#171717; letter-spacing:2px;">
                ${licenceKey}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 16px;">
          Go to your dashboard and activate this key to unlock 30 days of unlimited Pro access.
        </p>
        <p style="margin:0; font-size:13px; color:#a3a3a3;">
          Keep sharing your referral code to earn more free months!
        </p>`,
      buttonLabel: "Activate My Key",
      buttonUrl: `${APP_URL}/dashboard/subscription`,
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
      heading: `Your subscription expires soon`,
      preheading: `${daysLeft} day${plural} left on your Pro plan. Renew to keep access.`,
      body: `
        <p style="margin:0 0 20px;">
          Hi ${firstName}, your Pro plan is running out.
        </p>
        <table cellpadding="0" cellspacing="0" role="presentation" style="width:100%; margin-bottom:20px;">
          <tr>
            <td align="center" style="padding:24px; background:#fffbeb; border-radius:10px; border-left:4px solid #f59e0b;">
              <p style="margin:0 0 4px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:#d97706;">Time remaining</p>
              <p style="margin:0; font-size:36px; font-weight:800; color:#171717; letter-spacing:-1px;">${daysLeft} day${plural}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0;">
          After expiration, your account switches to Free and you'll lose access to premium courses. Renew now to keep learning.
        </p>`,
      buttonLabel: "Renew Pro",
      buttonUrl: "https://jwxfcqrf.mychariow.shop/prd_o6clpf/checkout",
    }),
  });
}
