function getWelcomeEmailHtml(userName, loginUrl) {
  const safeName = userName || 'there';
  const safeLoginUrl = loginUrl || 'http://localhost:5173';

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to IELTS Master</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,sans-serif;color:#1e293b;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f7fb;margin:0;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#b91c1c 0%,#ef4444 100%);padding:32px 40px;color:#ffffff;">
                <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.85;font-weight:bold;">IELTS Master</div>
                <h1 style="margin:12px 0 8px;font-size:30px;line-height:1.2;">Welcome, ${safeName}!</h1>
                <p style="margin:0;font-size:16px;line-height:1.6;opacity:0.95;">Your IELTS preparation journey starts now. Reading, Listening, Writing, and Speaking practice are ready for you.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px 32px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Your account has been created successfully. We built IELTS Master to help you practice consistently, track progress clearly, and move faster toward your target band score.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background:#fff5f5;border:1px solid #fecaca;border-radius:16px;">
                  <tr>
                    <td style="padding:20px 22px;">
                      <div style="font-size:15px;font-weight:bold;color:#991b1b;margin-bottom:8px;">What you can do next</div>
                      <ul style="padding-left:18px;margin:0;color:#475569;font-size:14px;line-height:1.8;">
                        <li>Take your first Reading or Listening practice test</li>
                        <li>Submit a Writing or Speaking task for evaluation</li>
                        <li>Track your progress from one dashboard</li>
                      </ul>
                    </td>
                  </tr>
                </table>
                <div style="margin:32px 0 24px;text-align:center;">
                  <a href="${safeLoginUrl}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:14px 28px;border-radius:999px;">Go to IELTS Master</a>
                </div>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#64748b;">If you did not create this account, you can safely ignore this email.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.7;color:#64748b;">
                IELTS Master<br />
                Smarter preparation for your target IELTS band.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = { getWelcomeEmailHtml };