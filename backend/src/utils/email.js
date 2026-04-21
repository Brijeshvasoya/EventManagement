const { Resend } = require('resend');
const QRCode = require('qrcode');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendTicketEmail = async (user, booking, event, pdfBuffer = null) => {
  const recipient = (process.env.RESEND_TEST_RECIPIENT || user.email).trim();
  const isTestRedirect = !!process.env.RESEND_TEST_RECIPIENT;
  const FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();

  try {
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const ticketUrl = `${BACKEND_URL}/api/tickets/download/${booking.id}`;
    const verifyUrl = `${FRONTEND_URL}/v/${booking.id}`;



    // ✅ Safe date parsing
    const eventDate = isNaN(event.date)
      ? new Date(event.date)
      : new Date(Number(event.date));

    const formattedDate = eventDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    console.log(`📤 Sending email via Resend... [From: ${FROM_EMAIL}, To: ${recipient}]`);

    const verifyQrBuffer = await QRCode.toBuffer(verifyUrl);


    const emailOptions = {
      from: FROM_EMAIL,
      to: recipient,
      subject: `Ticket Confirmed: ${event.title} 🎉`,

      // ✅ Plain text fallback
      text: `
Your ticket is confirmed!

Event: ${event.title}
Guest: ${user.name}
Date: ${formattedDate}
Location: ${event.location}
Tier: ${booking.ticketType}
Booking ID: #${booking.id.slice(-8).toUpperCase()}

View your ticket: ${ticketUrl}
      `,

      // ✅ HTML Email
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 40px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🎟️ Your Ticket is Secured!</h1>
            <p style="opacity: 0.85;">
              Get ready for an amazing experience. Your ticket is attached below.
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 30px; background: white;">
            <h2 style="color: #1e1b4b; margin-top: 0;">${event.title}</h2>

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">

            <p><strong>Guest:</strong> ${user.name}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p><strong>Tier:</strong> ${booking.ticketType}</p>
            <p><strong>Booking ID:</strong> #${booking.id.slice(-8).toUpperCase()}</p>

            <!-- QR Code Section -->
            <div style="text-align: center; margin-top: 30px; padding: 20px; border: 1px dashed #e2e8f0; border-radius: 12px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e1b4b;">Scan QR Code for Ticket Download</p>
              <img src="${BACKEND_URL}/api/tickets/qr/${booking.id}" alt="Entry QR Code" style="width: 180px; height: 180px;" />
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8; font-family: monospace;">#${booking.id.slice(-8).toUpperCase()}</p>
            </div>


            <!-- Note -->
            <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 12px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">
                Show this QR code or the attached PDF at the venue entrance.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 20px; background: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 EventHub SaaS. All rights reserved.
          </div>
        </div>
      `,
    };

    // ✅ Attachments: PDF ticket and standalone QR entry pass
    emailOptions.attachments = [
      {
        filename: 'Entry_Pass_QR.png',
        content: verifyQrBuffer,
      }
    ];



    if (pdfBuffer) {
      emailOptions.attachments.push({
        filename: `Ticket_${event.title.replace(/\s+/g, '_')}.pdf`,
        content: pdfBuffer,
      });
    }

    // ✅ Send email
    const response = await resend.emails.send(emailOptions);

    if (response.error) {
      const errorMsg = response.error.message || 'Unknown Resend Error';

      // Detailed logging for debugging
      console.error('❌ Resend API Error Object:', JSON.stringify(response.error, null, 2));

      // Handle known Resend Sandbox restriction
      if (errorMsg.toLowerCase().includes('testing emails') || errorMsg.toLowerCase().includes('sandbox')) {
        console.warn('⚠️  RESEND SANDBOX LIMITATION: You can only send emails to your verified account email.');
        console.warn(`   Attempted recipient: ${recipient}`);
        return;
      }

      throw new Error(errorMsg);
    }

    console.log(`✅ Ticket email sent to ${recipient}${isTestRedirect ? ' (Redirected Test Mail)' : ''}`);
  } catch (error) {
    const isSandbox = error.message && (error.message.toLowerCase().includes('testing emails') || error.message.toLowerCase().includes('sandbox'));

    console.error(`❌ DISPATCH ERROR: Failed to send ticket email to ${recipient}`);

    if (isSandbox) {
      console.error('👉 FIX: In sandbox mode, the recipient MUST be your registered Resend email (or verify your domain).');
    } else {
      console.error('Full stack trace:', error);
    }
  }
};