const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

exports.generateTicketPDF = async (user, booking, event) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 0, 
        info: {
          Title: `Ticket - ${event.title}`,
          Author: 'EventHub Premium',
        }
      });

      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const result = Buffer.concat(buffers);
        resolve(result);
      });

      // --- COLORS & THEME ---
      const primary = '#1e1b4b'; // Deep Indigo
      const accent = '#4f46e5';  // Indigo
      const textMain = '#1e293b';
      const textMuted = '#64748b';
      const bgLight = '#f8fafc';
      const border = '#e2e8f0';

      // Draw page background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');

      // --- TICKET CARD DESIGN ---
      const ticketMargin = 40;
      const ticketWidth = doc.page.width - (ticketMargin * 2);
      const ticketHeight = 350; 
      const startY = 80;

      // Main Card Container with shadow effect
      doc.save();
      doc.roundedRect(ticketMargin + 2, startY + 2, ticketWidth, ticketHeight, 12).fill('#f1f5f9'); // Shadow
      doc.roundedRect(ticketMargin, startY, ticketWidth, ticketHeight, 12).fill('#ffffff');
      doc.roundedRect(ticketMargin, startY, ticketWidth, ticketHeight, 12).lineWidth(1).strokeColor(border).stroke();
      doc.restore();

      // Left Section Header (Indigo Background)
      const headerHeight = 85;
      doc.save();
      doc.path(`M ${ticketMargin + 12} ${startY} L ${ticketMargin + ticketWidth - 12} ${startY} Q ${ticketMargin + ticketWidth} ${startY} ${ticketMargin + ticketWidth} ${startY + 12} L ${ticketMargin + ticketWidth} ${startY + headerHeight} L ${ticketMargin} ${startY + headerHeight} L ${ticketMargin} ${startY + 12} Q ${ticketMargin} ${startY} ${ticketMargin + 12} ${startY} Z`)
         .fill(primary);
      doc.restore();

      // Header Text
      doc.fillColor('#ffffff')
         .fontSize(9)
         .font('Helvetica')
         .text('OFFICIAL EVENT ACCESS PASS', ticketMargin + 30, startY + 22, { characterSpacing: 1.5 });
      
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(event.title.toUpperCase(), ticketMargin + 30, startY + 38, { width: ticketWidth - 60, ellipsis: true });

      // Dividers & Columns
      const sidebarWidth = 180;
      const dividerX = ticketMargin + ticketWidth - sidebarWidth;

      // Vertical Dotted Divider
      doc.save()
         .moveTo(dividerX, startY + headerHeight)
         .lineTo(dividerX, startY + ticketHeight)
         .dash(4, { space: 4 })
         .strokeColor('#cbd5e1')
         .lineWidth(1)
         .stroke()
         .restore();

      // --- LEFT CONTENT (DETAILS) ---
      const contentPadding = 30;
      const leftX = ticketMargin + contentPadding;
      let currentY = startY + headerHeight + 25;

      // Row 1: Guest Name
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(9).text('GUEST NAME', leftX, currentY);
      doc.fillColor(textMain).font('Helvetica-Bold').fontSize(20).text(user.name, leftX, currentY + 14);

      currentY += 65;

      // Row 2: Date & Location
      // Column A: Date
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(9).text('DATE & TIME', leftX, currentY);
      const eventDate = new Date(parseInt(event.date) || event.date);
      doc.fillColor(textMain).font('Helvetica-Bold').fontSize(14).text(eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }), leftX, currentY + 14);
      doc.fillColor(textMuted).font('Helvetica').fontSize(11).text(eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), leftX, currentY + 32);

      // Column B: Location
      const col2X = leftX + 220;
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(9).text('LOCATION', col2X, currentY);
      doc.fillColor(textMain).font('Helvetica-Bold').fontSize(12).text(event.location, col2X, currentY + 14, { width: dividerX - col2X - 20, height: 40 });

      currentY += 75;

      // Row 3: Ticket ID & Type
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(9).text('TICKET ID', leftX, currentY);
      doc.fillColor(textMain).font('Helvetica').fontSize(11).text(`#${booking.id.slice(-8).toUpperCase()}`, leftX, currentY + 14);

      doc.fillColor(accent).font('Helvetica-Bold').fontSize(9).text('TIER / ACCESS', col2X, currentY);
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(14).text(booking.ticketType || 'REGULAR', col2X, currentY + 14);

      // Quantity Badge
      const qtyText = `${booking.quantity || 1} ADMIT`;
      const qtyWidth = doc.widthOfString(qtyText) + 20;
      doc.roundedRect(dividerX - qtyWidth - 30, startY + headerHeight + 25, qtyWidth, 20, 4).fill('#f1f5f9');
      doc.fillColor(textMain).fontSize(9).font('Helvetica-Bold').text(qtyText, dividerX - qtyWidth - 20, startY + headerHeight + 31);

      // --- RIGHT CONTENT (QR CODE) ---
      const qrAreaX = dividerX;
      const qrSectionWidth = sidebarWidth;
      
      // Light background for QR area
      doc.path(`M ${dividerX} ${startY + headerHeight} L ${ticketMargin + ticketWidth - 12} ${startY + headerHeight} L ${ticketMargin + ticketWidth} ${startY + headerHeight} L ${ticketMargin + ticketWidth} ${startY + ticketHeight - 12} Q ${ticketMargin + ticketWidth} ${startY + ticketHeight} ${ticketMargin + ticketWidth - 12} ${startY + ticketHeight} L ${dividerX} ${startY + ticketHeight} Z`)
         .fill(bgLight);

      // Generate QR Code
      const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
      const qrDataUrl = await QRCode.toDataURL(`${FRONTEND_URL}/v/${booking.id}`, {
        margin: 1,
        width: 400,
        color: {
          dark: primary,
          light: bgLight
        }
      });
      const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      const qrSize = 120;
      doc.image(qrImageBuffer, qrAreaX + (qrSectionWidth - qrSize) / 2, startY + headerHeight + 40, { width: qrSize });
      
      doc.fillColor(primary).font('Helvetica-Bold').fontSize(8)
         .text('SCAN FOR GATE ENTRY', qrAreaX, startY + headerHeight + 175, { width: qrSectionWidth, align: 'center' });

      doc.fillColor(textMuted).font('Helvetica').fontSize(6)
         .text(booking.id, qrAreaX + 10, startY + ticketHeight - 20, { width: qrSectionWidth - 20, align: 'center' });

      // --- FOOTER ---
      doc.fillColor('#94a3b8')
         .fontSize(8)
         .font('Helvetica')
         .text('This is a digital pass powered by EventHub. Please bring a valid ID for verification.', 0, startY + ticketHeight + 30, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

exports.generateRefundSlipPDF = async (user, booking, event) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 0,
        info: {
          Title: `Refund Slip - ${event.title}`,
          Author: 'EventHub Billing',
        }
      });

      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const result = Buffer.concat(buffers);
        resolve(result);
      });

      // ── THEME ──────────────────────────────────────────────────
      const navy     = '#1B2A4E';
      const navyDark = '#0F1C36';
      const amber    = '#F59E0B';
      const emerald  = '#059669';
      const red      = '#EF4444';
      const redLight = '#FEF2F2';
      const textMain = '#1E293B';
      const textMuted= '#64748B';
      const grayBg   = '#F8FAFC';
      const border   = '#E2E8F0';
      const white    = '#FFFFFF';

      const pageW = doc.page.width;   // 595.28
      const margin = 50;
      const contentW = pageW - margin * 2;

      // ── FULL PAGE WHITE BG ──────────────────────────────────────
      doc.rect(0, 0, pageW, doc.page.height).fill(white);

      // ── HEADER BAND ─────────────────────────────────────────────
      const headerH = 100;
      doc.rect(0, 0, pageW, headerH).fill(navy);

      // Logo badge (rounded rect)
      const badgeSize = 36;
      const badgeX = margin;
      const badgeY = (headerH - badgeSize) / 2;
      doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, 8).fill(white);
      doc.fillColor(navy)
         .font('Helvetica-Bold')
         .fontSize(18)
         .text('E', badgeX, badgeY + 8, { width: badgeSize, align: 'center' });

      // Company name
      doc.fillColor(white)
         .font('Helvetica-Bold')
         .fontSize(18)
         .text('EventHub', badgeX + badgeSize + 10, badgeY + 8);

      // Refund Slip title (right aligned)
      doc.fillColor(white)
         .font('Helvetica-Bold')
         .fontSize(26)
         .text('REFUND SLIP', 0, badgeY - 2, { width: pageW - margin, align: 'right' });

      doc.fillColor('#A5B4C8')
         .font('Helvetica')
         .fontSize(10)
         .text('OFFICIAL CANCELLATION RECEIPT', 0, badgeY + 30, { width: pageW - margin, align: 'right' });

      // ── AMBER ACCENT STRIPE ─────────────────────────────────────
      doc.rect(0, headerH, pageW, 5).fill(amber);

      // ── META ROW (Date + Slip Number + Status Badge) ────────────
      const metaY = headerH + 5 + 28;
      const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
      const refNumber = `REF-${booking.id.slice(-8).toUpperCase()}`;

      doc.fillColor(textMuted)
         .font('Helvetica')
         .fontSize(10)
         .text(`Issue date: ${issueDate}`, margin, metaY)
         .text(`Refund slip number: ${refNumber}`, margin, metaY + 16);

      // Status badge (pill) — dynamic based on paymentStatus
      const statusMap = {
        REFUNDED:  { label: 'REFUNDED',   color: emerald },
        PAID:      { label: 'PAID',        color: '#2563EB' },   // blue
        PENDING:   { label: 'PROCESSING',  color: amber },
        FAILED:    { label: 'FAILED',      color: red },
      };
      const statusCfg = statusMap[booking.paymentStatus] || { label: 'PROCESSING', color: amber };
      const badgeTxt = statusCfg.label;
      const badgeTxtW = doc.widthOfString(badgeTxt, { fontSize: 9 });
      const pillW = badgeTxtW + 24;
      const pillH = 22;
      const pillX = pageW - margin - pillW;
      const pillY = metaY + 2;
      doc.roundedRect(pillX, pillY, pillW, pillH, 11).fill(statusCfg.color);
      doc.fillColor(white)
         .font('Helvetica-Bold')
         .fontSize(9)
         .text(badgeTxt, pillX, pillY + 6, { width: pillW, align: 'center' });

      // ── INFO CARDS ROW ──────────────────────────────────────────
      const cardTop = metaY + 60;
      const cardH = 90;
      const cardW = (contentW - 20) / 2;

      // Left card: Billed To
      doc.roundedRect(margin, cardTop, cardW, cardH, 8).fill(grayBg);
      doc.fillColor(textMain)
         .font('Helvetica-Bold')
         .fontSize(10)
         .text('BILLED TO', margin + 16, cardTop + 14);
      doc.fillColor(textMuted)
         .font('Helvetica')
         .fontSize(10)
         .text(user.name || 'N/A', margin + 16, cardTop + 32)
         .text(user.email || 'N/A', margin + 16, cardTop + 50);

      // Right card: Booking Details
      const card2X = margin + cardW + 20;
      doc.roundedRect(card2X, cardTop, cardW, cardH, 8).fill(grayBg);
      doc.fillColor(textMain)
         .font('Helvetica-Bold')
         .fontSize(10)
         .text('BOOKING DETAILS', card2X + 16, cardTop + 14);

      const eventDate = new Date(parseInt(event.date) || event.date);
      const fDate = eventDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

      doc.fillColor(textMuted)
         .font('Helvetica')
         .fontSize(9)
         .text(`Booking ID: #${booking.id.slice(-8).toUpperCase()}`, card2X + 16, cardTop + 32)
         .text(`Event: ${event.title}`, card2X + 16, cardTop + 48, { width: cardW - 32, ellipsis: true })
         .text(`Date: ${fDate}  |  Tier: ${booking.ticketType || 'REGULAR'}`, card2X + 16, cardTop + 63);

      // ── LINE-ITEM TABLE ─────────────────────────────────────────
      const tableTop = cardTop + cardH + 30;
      const tableRowH = 32;
      const col = { desc: margin, qty: margin + 280, unit: margin + 360, amt: margin + 450 };

      // Table header
      doc.rect(margin, tableTop, contentW, tableRowH).fill(navy);
      doc.fillColor(white)
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('DESCRIPTION',   col.desc + 10, tableTop + 11)
         .text('QTY',           col.qty,        tableTop + 11, { width: 60, align: 'center' })
         .text('UNIT PRICE',    col.unit,        tableTop + 11, { width: 70, align: 'right' })
         .text('AMOUNT',        col.amt,         tableTop + 11, { width: 45, align: 'right' });

      // Row 1: Ticket
      const unitPrice = booking.quantity > 0 ? (booking.amountPaid / booking.quantity) : booking.amountPaid;
      const row1Y = tableTop + tableRowH;
      doc.rect(margin, row1Y, contentW, tableRowH).fill(white);
      doc.fillColor(textMain)
         .font('Helvetica')
         .fontSize(9)
         .text(`Event Ticket: ${event.title}`, col.desc + 10, row1Y + 12, { width: 260, ellipsis: true })
         .text(`${booking.quantity || 1}`,       col.qty,        row1Y + 12, { width: 60, align: 'center' })
         .text(`$${unitPrice.toFixed(2)}`,        col.unit,        row1Y + 12, { width: 70, align: 'right' })
         .text(`$${Number(booking.amountPaid).toFixed(2)}`, col.amt, row1Y + 12, { width: 45, align: 'right' });

      // Thin divider
      doc.rect(margin, row1Y + tableRowH - 1, contentW, 1).fill(border);

      // Row 2: Deduction (red tinted)
      const row2Y = row1Y + tableRowH;
      doc.rect(margin, row2Y, contentW, tableRowH).fill(redLight);
      doc.fillColor(red)
         .font('Helvetica')
         .fontSize(9)
         .text('Platform Handling Fee (25% cancellation charge)', col.desc + 10, row2Y + 12, { width: 380 })
         .text(`-$${(booking.amountPaid * 0.25).toFixed(2)}`, col.amt, row2Y + 12, { width: 45, align: 'right' });

      // Table bottom border
      doc.rect(margin, row2Y + tableRowH, contentW, 1).fill(border);

      // ── SUMMARY BOX (bottom right) ──────────────────────────────
      const sumW = 240;
      const sumX = pageW - margin - sumW;
      const sumTop = row2Y + tableRowH + 24;
      const sumPad = 16;

      doc.roundedRect(sumX, sumTop, sumW, 95, 8)
         .lineWidth(1)
         .strokeColor(border)
         .stroke();

      // Original Amount
      doc.fillColor(textMuted).font('Helvetica').fontSize(9)
         .text('Original Amount Paid:', sumX + sumPad, sumTop + 14);
      doc.fillColor(textMain).font('Helvetica').fontSize(9)
         .text(`$${Number(booking.amountPaid).toFixed(2)}`, sumX, sumTop + 14, { width: sumW - sumPad, align: 'right' });

      // Deduction
      doc.fillColor(textMuted).font('Helvetica').fontSize(9)
         .text('Handling Deduction (25%):', sumX + sumPad, sumTop + 34);
      doc.fillColor(red).font('Helvetica').fontSize(9)
         .text(`-$${(booking.amountPaid * 0.25).toFixed(2)}`, sumX, sumTop + 34, { width: sumW - sumPad, align: 'right' });

      // Divider
      doc.rect(sumX + sumPad, sumTop + 54, sumW - sumPad * 2, 1).fill(border);

      // Net Refund
      doc.fillColor(textMain).font('Helvetica-Bold').fontSize(10)
         .text('NET REFUND AMOUNT:', sumX + sumPad, sumTop + 65);
      doc.fillColor(emerald).font('Helvetica-Bold').fontSize(12)
         .text(`$${(booking.amountPaid * 0.75).toFixed(2)}`, sumX, sumTop + 63, { width: sumW - sumPad, align: 'right' });

      // ── EMERALD INFO BAR ────────────────────────────────────────
      const barY = sumTop + 95 + 30;
      doc.rect(margin, barY, contentW, 32).fill(emerald);
      doc.fillColor(white)
         .font('Helvetica')
         .fontSize(10)
         .text('Refund will be credited within 5-10 business days to your original payment method.', margin, barY + 10, {
           width: contentW,
           align: 'center'
         });

      // ── NOTE BOX ────────────────────────────────────────────────
      doc.fillColor(textMuted)
         .font('Helvetica')
         .fontSize(8)
         .text(
           'Note: The 25% deduction covers Platform Handling, Payment Gateway fees, and administrative costs. Refund timelines may vary depending on your bank or payment provider.',
           margin, barY + 48,
           { width: contentW, align: 'center' }
         );

      // ── FOOTER ──────────────────────────────────────────────────
      const footerY = doc.page.height - 36;
      doc.rect(0, footerY, pageW, 36).fill(grayBg);
      doc.fillColor(textMuted)
         .font('Helvetica')
         .fontSize(8)
         .text('© 2026 EventHub SaaS  ·  support@eventhub.com  ·  All rights reserved', 0, footerY + 14, {
           width: pageW,
           align: 'center'
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
