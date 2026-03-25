/**
 * email.service.js
 * ────────────────────────────────────────────────
 * Nodemailer transport configured from SMTP_* env vars.
 * Provides a single public helper: sendTemplateEmail(to, subject, htmlBody)
 */

const nodemailer = require('nodemailer');
const { getWelcomeEmailHtml } = require('../templates/emails/welcome.template');

// Lazy-initialized singleton transporter
let transporter = null;

/**
 * Build (or return cached) Nodemailer transport using SMTP env vars.
 */
function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false, // STARTTLS on 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Send a templated email via Nodemailer.
 *
 * @param {string} to       – Recipient email address
 * @param {string} subject  – Email subject line
 * @param {string} htmlBody – Rendered HTML body
 * @returns {Promise<Object>} Nodemailer send result
 */
async function sendTemplateEmail(to, subject, htmlBody) {
  const transport = getTransporter();
  const from = process.env.EMAIL_FROM || 'noreply@ielts-platform.com';

  const info = await transport.sendMail({ from, to, subject, html: htmlBody });
  console.log(`📧 Email sent to ${to} — messageId: ${info.messageId}`);
  return info;
}

async function sendWelcomeEmail(userEmail, userName) {
  const loginUrl = process.env.FRONTEND_LOGIN_URL || 'http://localhost:5173';
  const htmlBody = getWelcomeEmailHtml(userName, loginUrl);
  return sendTemplateEmail(userEmail, 'Welcome to IELTS Master', htmlBody);
}

module.exports = { sendTemplateEmail, sendWelcomeEmail, getTransporter };
