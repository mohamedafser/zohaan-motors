function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function inviteEmail({ firstName, link }: { firstName: string; link: string }) {
  const name = escapeHtml(firstName);
  const href = escapeHtml(link);

  const subject = "You're invited to Zohaan Motors";

  const text = [
    `Hi ${firstName},`,
    "",
    "You've been invited to Zohaan Motors. Open the link below to verify your email and set your password:",
    link,
    "",
    "If you weren't expecting this, you can ignore this email.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f1eb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a2126">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px">
          <tr><td>
            <p style="margin:0 0 24px;font-size:18px;font-weight:600">Zohaan Motors</p>
            <p style="margin:0 0 12px;font-size:15px">Hi ${name},</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.5">
              You've been invited to Zohaan Motors. Verify your email and set your password to get started.
            </p>
            <a href="${href}" style="display:inline-block;background:#b8955a;color:#1a2126;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">
              Verify email &amp; set password
            </a>
            <p dir="rtl" style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#4a5560">
              تمت دعوتك إلى زوهان موتورز. اضغط على الزر أعلاه لتأكيد بريدك الإلكتروني وتعيين كلمة المرور.
            </p>
            <p style="margin:24px 0 0;font-size:12px;color:#7a858f;line-height:1.5">
              If the button doesn't work, copy this link into your browser:<br>
              <span style="word-break:break-all">${href}</span><br><br>
              If you weren't expecting this, you can ignore this email.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
