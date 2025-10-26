const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendInvitationEmail = async (inviteeEmail, inviteeName, inviterName, bookName) => {
  const inviteUrl = `${process.env.FRONTEND_URL}/invitations/respond?email=${encodeURIComponent(inviteeEmail)}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: inviteeEmail,
    subject: `${inviterName} invited you to collaborate on "${bookName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to collaborate!</h2>
        <p>Hi ${inviteeName},</p>
        <p><strong>${inviterName}</strong> has invited you to collaborate on the book "<strong>${bookName}</strong>" on freundebuch.io.</p>
        <p>Click the link below to respond to your invitation:</p>
        <a href="${inviteUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Respond to Invitation
        </a>
        <p>You can either register for an account or answer questions directly without registering.</p>
        <p>Best regards,<br>The freundebuch.io team</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendInvitationEmail };