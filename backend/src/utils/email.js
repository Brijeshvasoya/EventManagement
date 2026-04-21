const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS (TLS upgrade), not implicit SSL on port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 5000, // 5 s to establish the TCP connection
  socketTimeout: 5000      // 5 s of inactivity before the socket is killed
});

// Verify SMTP connectivity on startup so misconfiguration surfaces immediately
// rather than silently failing on the first real email send.
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.error('   Check EMAIL_USER / EMAIL_PASS env vars and that the Gmail');
    console.error('   account has an App Password configured (2FA required).');
  } else {
    console.log('✅ SMTP transporter is ready to send emails');
  }
});

exports.sendTicketEmail = async (user, booking, event) => {
  const mailOptions = {
    from: `"EventHub Premium" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: `Ticket Confirmed: ${event.title} 🎉`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 40px; color: white; textAlign: center;">
          <h1 style="margin: 0; font-size: 24px;">Your Ticket is Secured!</h1>
          <p style="opacity: 0.8;">Get ready for an amazing experience.</p>
        </div>
        <div style="padding: 30px; background: white;">
          <h2 style="color: #1e1b4b; margin-top: 0;">${event.title}</h2>
          <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          <p><strong>Guest:</strong> ${user.name}</p>
          <p><strong>Date:</strong> ${new Date(parseInt(event.date) || event.date).toLocaleDateString()}</p>
          <p><strong>Location:</strong> ${event.location}</p>
          <p><strong>Tier:</strong> ${booking.ticketType}</p>
          <p><strong>Booking ID:</strong> #${booking.id.slice(-8).toUpperCase()}</p>
          
          <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 12px; textAlign: center;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">Show this email or your dashboard QR code at the venue entrance.</p>
          </div>
        </div>
        <div style="padding: 20px; background: #f1f5f9; textAlign: center; font-size: 12px; color: #94a3b8;">
          © 2026 EventHub SaaS. All rights reserved.
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Ticket email sent to ${user.email}`);
  } catch (error) {
    console.error(`❌ Failed to send ticket email to ${user.email}`);
    console.error('   Code    :', error.code);       // e.g. ECONNREFUSED, ETIMEDOUT
    console.error('   Message :', error.message);
    console.error('   Response:', error.response);   // SMTP server reply, if any
  }
};
