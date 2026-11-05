const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: (process.env.EMAIL_PASS || '').replace(/\s/g, ''),
  },
});

async function sendOtpEmail(to, otp) {
  await transporter.sendMail({
    from: '"Creators Hub" <' + process.env.EMAIL_USER + '>',
    to,
    subject: 'Your Creators Hub password reset code',
    text:
      'Your code is ' + otp + '. It is valid for 10 minutes. ' +
      'If you did not ask for this, you can ignore this email.',
    html:
      '<div style="font-family:Arial,sans-serif;max-width:420px">' +
      '<h2>Creators Hub</h2>' +
      '<p>Use this code to reset your password:</p>' +
      '<p style="font-size:32px;letter-spacing:8px;font-weight:bold">' + otp + '</p>' +
      '<p>It is valid for 10 minutes. If you did not ask for this, you can ignore this email.</p>' +
      '</div>',
  });
}

module.exports = { sendOtpEmail };