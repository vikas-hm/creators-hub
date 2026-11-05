const nodemailer = require('nodemailer');

const subject = 'Your Creators Hub password reset code';

const textBody = (otp) =>
  'Your code is ' + otp + '. It is valid for 10 minutes. ' +
  'If you did not ask for this, you can ignore this email.';

const htmlBody = (otp) =>
  '<div style="font-family:Arial,sans-serif;max-width:420px">' +
  '<h2>Creators Hub</h2>' +
  '<p>Use this code to reset your password:</p>' +
  '<p style="font-size:32px;letter-spacing:8px;font-weight:bold">' + otp + '</p>' +
  '<p>It is valid for 10 minutes. If you did not ask for this, you can ignore this email.</p>' +
  '</div>';

// Used online (works over normal HTTPS, so free hosts do not block it)
async function sendWithBrevo(to, otp) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Creators Hub', email: process.env.BREVO_SENDER },
      to: [{ email: to }],
      subject,
      textContent: textBody(otp),
      htmlContent: htmlBody(otp),
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error('Brevo ' + res.status + ': ' + detail);
  }
}

// Used on your laptop
async function sendWithGmail(to, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: (process.env.EMAIL_PASS || '').replace(/\s/g, ''),
    },
  });

  await transporter.sendMail({
    from: '"Creators Hub" <' + process.env.EMAIL_USER + '>',
    to,
    subject,
    text: textBody(otp),
    html: htmlBody(otp),
  });
}

async function sendOtpEmail(to, otp) {
  if (process.env.BREVO_API_KEY) return sendWithBrevo(to, otp);
  return sendWithGmail(to, otp);
}

module.exports = { sendOtpEmail };