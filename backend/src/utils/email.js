const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendTicketEmail = async (user, booking, event) => {
  try {
    await resend.emails.send({
      from: 'EventHub Premium <noreply@eventhub.resend.dev>',
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
    });
    console.log(`✅ Ticket email sent to ${user.email}`);
  } catch (error) {
    console.error(`❌ Failed to send ticket email to ${user.email}`);
    console.error('   Message :', error.message);
  }
};
