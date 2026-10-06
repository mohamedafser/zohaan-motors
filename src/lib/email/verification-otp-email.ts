import { sendEmail } from "@/lib/email/send-email";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function verificationOtpEmail({
  otp,
  expiresInMinutes,
  verifyUrl,
}: {
  otp: string;
  expiresInMinutes: number;
  verifyUrl: string;
}) {
  const code = escapeHtml(otp);
  const href = escapeHtml(verifyUrl);
  const subject = "Verify your Zohaan Motors account";

  const text = [
    "ZOHAAN MOTORS",
    "",
    "Verify your email address",
    "",
    "Your verification code is:",
    "",
    `    ${otp}`,
    "",
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "For your security, do not share this code with anyone.",
    "",
    `Enter it on the verification page: ${verifyUrl}`,
    "",
    "If you did not create a Zohaan Motors account, you can ignore this email.",
    "",
    "Regards,",
    "Zohaan Motors",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f1eb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a2126">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden">
          <tr><td style="background:#000000;padding:20px 32px">
            <p style="margin:0;font-size:16px;font-weight:700;letter-spacing:4px;color:#d4af6a">ZOHAAN MOTORS</p>
          </td></tr>
          <tr><td style="padding:32px">
            <p style="margin:0 0 8px;font-size:22px;font-weight:600">Verify your email</p>
            <p style="margin:0 0 24px;font-size:15px;color:#4a5560">Your verification code is:</p>
            <p style="margin:0 0 24px;padding:16px;background:#f4f1eb;border-radius:8px;text-align:center;font-size:34px;font-weight:700;letter-spacing:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace">${code}</p>
            <p style="margin:0 0 8px;font-size:14px;color:#4a5560">This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
            <p style="margin:0 0 24px;font-size:14px;color:#4a5560">For your security, do not share this code with anyone.</p>
            <p style="margin:0 0 24px;font-size:14px"><a href="${href}" style="color:#8a6a35">Open the verification page</a></p>
            <p dir="rtl" style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#4a5560">
              رمز التحقق الخاص بك أعلاه، وينتهي خلال ${expiresInMinutes} دقائق. لا تشارك هذا الرمز مع أي شخص.
            </p>
            <p style="margin:0;font-size:12px;line-height:1.6;color:#7a858f">
              If you did not create a Zohaan Motors account, you can ignore this email.<br><br>
              Regards,<br>Zohaan Motors
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

export async function sendVerificationOtpEmail({
  email,
  otp,
  expiresInMinutes,
  verifyUrl,
}: {
  email: string;
  otp: string;
  expiresInMinutes: number;
  verifyUrl: string;
}) {
  await sendEmail({ to: email, ...verificationOtpEmail({ otp, expiresInMinutes, verifyUrl }) });
}
