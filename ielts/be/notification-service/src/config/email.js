const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Send an email.
 * @param {string} to - Recipient address
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 */
async function sendEmail(to, subject, html) {
  const transport = getTransporter();
  const from = process.env.EMAIL_FROM || 'noreply@ielts-platform.com';

  const info = await transport.sendMail({ from, to, subject, html });
  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
}

module.exports = { sendEmail, getTransporter };
