import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = process.env.FROM_EMAIL || "Brightroots <noreply@resend.dev>";
const APP_NAME = "Brightroots";

/**
 * Send a welcome email when a new user signs up.
 */
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
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #171717;">
  <h1 style="font-size: 24px; margin-bottom: 16px;">Welcome to ${APP_NAME}!</h1>
  <p style="font-size: 16px; line-height: 1.6; color: #525252;">
    Hi ${firstName},
  </p>
  <p style="font-size: 16px; line-height: 1.6; color: #525252;">
    Thank you for joining ${APP_NAME}. You now have access to our free courses.
    Browse our catalog and start learning today.
  </p>
  <p style="font-size: 16px; line-height: 1.6; color: #525252;">
    Want to unlock all courses? Upgrade to Pro for 15,000 FCFA/month and get
    unlimited access to every course, certificates, and downloadable resources.
  </p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app"}"
     style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 8px;">
    Start Learning
  </a>
  <p style="font-size: 14px; color: #a3a3a3; margin-top: 32px;">
    — Alex Landrin, ${APP_NAME}
  </p>
</body>
</html>`,
  });
}

/**
 * Send a course completion email with congratulations.
 */
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
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #171717;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="display: inline-block; background: #fef3c7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px;">
      🎉
    </div>
  </div>
  <h1 style="font-size: 24px; margin-bottom: 16px; text-align: center;">
    Congratulations, ${firstName}!
  </h1>
  <p style="font-size: 16px; line-height: 1.6; color: #525252; text-align: center;">
    You've completed <strong>${courseTitle}</strong>.
    Your dedication to learning is inspiring.
  </p>
  <div style="text-align: center; margin-top: 24px;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app"}/dashboard/certificates"
       style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      View Certificate
    </a>
  </div>
  <p style="font-size: 16px; line-height: 1.6; color: #525252; text-align: center; margin-top: 24px;">
    Keep the momentum going — explore more courses in our catalog.
  </p>
  <p style="font-size: 14px; color: #a3a3a3; margin-top: 32px; text-align: center;">
    — Alex Landrin, ${APP_NAME}
  </p>
</body>
</html>`,
  });
}

/**
 * Send a subscription confirmation email.
 */
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
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #171717;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="display: inline-block; background: #fef3c7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; font-size: 32px;">
      👑
    </div>
  </div>
  <h1 style="font-size: 24px; margin-bottom: 16px; text-align: center;">
    Welcome to Pro, ${firstName}!
  </h1>
  <p style="font-size: 16px; line-height: 1.6; color: #525252;">
    Your Pro membership is now active. You have unlimited access to:
  </p>
  <ul style="font-size: 16px; line-height: 1.8; color: #525252;">
    <li>All premium courses</li>
    <li>Downloadable resources</li>
    <li>Certificates of completion</li>
    <li>Priority support</li>
  </ul>
  <div style="text-align: center; margin-top: 24px;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://academia-vert-phi.vercel.app"}"
       style="display: inline-block; background: #171717; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
      Browse All Courses
    </a>
  </div>
  <p style="font-size: 14px; color: #a3a3a3; margin-top: 32px; text-align: center;">
    — Alex Landrin, ${APP_NAME}
  </p>
</body>
</html>`,
  });
}

/**
 * Send a renewal reminder email when Pro is about to expire.
 */
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

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Pro plan expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #171717;">
  <h1 style="font-size: 24px; margin-bottom: 16px;">Hi ${firstName},</h1>
  <p style="font-size: 16px; line-height: 1.6; color: #525252;">
    Your Pro plan on ${APP_NAME} expires in <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.
    Renew now to keep unlimited access to all courses.
  </p>
  <div style="text-align: center; margin: 24px 0;">
    <a href="https://jwxfcqrf.mychariow.shop/prd_o6clpf/checkout"
       style="display: inline-block; background: #171717; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
      Renew Pro — $27
    </a>
  </div>
  <p style="font-size: 14px; color: #a3a3a3;">
    If you don't renew, your account will switch to the Free plan and you'll lose access to premium courses.
  </p>
  <p style="font-size: 14px; color: #a3a3a3; margin-top: 32px;">
    — Alex Landrin, ${APP_NAME}
  </p>
</body>
</html>`,
  });
}
