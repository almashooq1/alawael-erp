// EmailService.js
// خدمة إرسال البريد الإلكتروني
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // يمكن التعديل حسب مزود الخدمة
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail({ to, subject, text, html }) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };
  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, info };
  } catch (error) {
    return { success: false, error };
  }
}

module.exports = { sendEmail };