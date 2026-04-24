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
                Use this QR code to download your ticket.
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

exports.sendPasswordResetEmail = async (email, name, token) => {
  const recipient = (process.env.RESEND_TEST_RECIPIENT || email).trim();
  const FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${FRONTEND_URL}/reset-password/${token}`;

  try {
    const emailOptions = {
      from: FROM_EMAIL,
      to: recipient,
      subject: 'Password Reset Request 🔐',
      text: `Hi ${name},\n\nYou requested a password reset. Please click on the link below to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email. This link will expire in 1 hour.`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 40px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🔐 Reset Your Password</h1>
            <p style="opacity: 0.85;">Securely reset your password below.</p>
          </div>
          <div style="padding: 30px; background: white;">
            <p>Hi <strong>${name}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #4338ca; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #64748b;">If you didn't request this, please ignore this email. This link will expire in 1 hour.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
            <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
              If the button doesn't work, copy and paste this URL into your browser: <br>
              ${resetUrl}
            </p>
          </div>
          <div style="padding: 20px; background: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 EventHub SaaS. All rights reserved.
          </div>
        </div>
      `,
    };

    await resend.emails.send(emailOptions);
  } catch (error) {
    console.error(`❌ RESET EMAIL ERROR: Failed to send to ${recipient}`, error);
  }
};

exports.sendCancellationEmail = async (user, booking, event, pdfBuffer = null) => {
  const recipient = (process.env.RESEND_TEST_RECIPIENT || user.email).trim();
  const FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();

  try {
    const eventDate = isNaN(event.date) ? new Date(event.date) : new Date(Number(event.date));
    const formattedDate = eventDate.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const emailOptions = {
      from: FROM_EMAIL,
      to: recipient,
      subject: `Ticket Cancelled: ${event.title} ❌`,
      text: `Hi ${user.name},\n\nYour ticket for "${event.title}" has been successfully cancelled.\n\nBooking ID: #${booking.id.slice(-8).toUpperCase()}\nEvent Date: ${formattedDate}\nLocation: ${event.location}\n\nWe hope to see you at another event soon!`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%); padding: 40px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">❌ Ticket Cancelled</h1>
            <p style="opacity: 0.85;">Your booking has been successfully cancelled.</p>
          </div>
          <div style="padding: 30px; background: white;">
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>Your ticket for the following event has been cancelled:</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h3 style="color: #1e1b4b; margin-top: 0;">${event.title}</h3>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>Location:</strong> ${event.location}</p>
              <p style="margin: 5px 0;"><strong>Booking ID:</strong> #${booking.id.slice(-8).toUpperCase()}</p>
            </div>
            <p>Your refund slip has been attached to this email.</p>
            <p style="color: #64748b; font-size: 14px;">We hope to see you at another event soon! Any applicable refunds will be processed according to the event's policy.</p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          </div>
          <div style="padding: 20px; background: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 EventHub SaaS. All rights reserved.
          </div>
        </div>
      `,
    };

    if (pdfBuffer) {
      emailOptions.attachments = [
        {
          filename: `Refund_Slip_${event.title.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
        }
      ];
    }
    const response = await resend.emails.send(emailOptions);
    if (response.error) throw new Error(response.error.message);
  } catch (error) {
    console.error(`❌ CANCELLATION EMAIL ERROR: Failed to send to ${recipient}`, error);
  }
};

exports.sendCheckInFeedbackEmail = async (user, booking, event) => {
  const recipient = (process.env.RESEND_TEST_RECIPIENT || user.email).trim();
  const FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const feedbackUrl = `${FRONTEND_URL}/feedback/${booking.id}`;

  try {
    const emailOptions = {
      from: FROM_EMAIL,
      to: recipient,
      subject: `How was "${event.title}"? 🌟`,
      text: `Hi ${user.name},\n\nYou've checked in to "${event.title}". We hope you're enjoying the experience! We'd love to hear your feedback. Please rate your experience here: ${feedbackUrl}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 100%); padding: 40px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">🌟 Enjoying the Event?</h1>
            <p style="opacity: 0.85;">We'd love to hear your feedback on "${event.title}"</p>
          </div>
          <div style="padding: 30px; background: white; text-align: center;">
            <p>Hi <strong>${user.name}</strong>,</p>
            <p>You've successfully checked in! To help us improve and support our organizers, please take a moment to rate your experience.</p>
            
            <div style="margin: 30px 0;">
              <a href="${feedbackUrl}" style="background: #4338ca; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Rate Organizer & Event</a>
            </div>

            <div style="color: #64748b; font-size: 14px; margin-top: 20px;">
              Your ratings help ${event.organizer?.name || 'the organizer'} grow!
            </div>

            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
          </div>
          <div style="padding: 20px; background: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
            © 2026 EventHub SaaS. All rights reserved.
          </div>
        </div>
      `,
    };

    await resend.emails.send(emailOptions);
  } catch (error) {
    console.error(`❌ FEEDBACK EMAIL ERROR: Failed to send to ${recipient}`, error);
  }
};