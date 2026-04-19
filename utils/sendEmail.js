const nodemailer = require("nodemailer");
require("dotenv").config();

// Create reusable transporter using Gmail SMTP from .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_SERVER,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send an email using the configured SMTP transporter
 * @param {Object} options - { to, subject, text, html }
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: `"Dravanua Hub" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Verify SMTP connection on startup
 */
const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP email server connected and ready");
    return true;
  } catch (error) {
    console.error("❌ SMTP connection failed:", error.message);
    console.error(
      "   Check your .env SMTP_SERVER, SMTP_PORT, SMTP_USER, SMTP_PASSWORD",
    );
    return false;
  }
};

module.exports = { sendEmail, verifyEmailConnection };
