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
        margin: 50,
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

      // Colors
      const primary = '#ef4444'; // Red for cancellation/refund
      const textMain = '#1e293b';
      const textMuted = '#64748b';
      const border = '#e2e8f0';

      // Header
      doc.fontSize(20).font('Helvetica-Bold').fillColor(primary).text('REFUND SLIP', { align: 'right' });
      doc.fontSize(10).font('Helvetica').fillColor(textMuted).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
      doc.moveDown(2);

      // Logo/Company
      doc.fontSize(16).font('Helvetica-Bold').fillColor(textMain).text('EventHub SaaS');
      doc.fontSize(10).font('Helvetica').fillColor(textMuted).text('Official Cancellation Receipt');
      doc.moveDown(2);

      // Customer Details
      doc.roundedRect(50, doc.y, 500, 80, 8).lineWidth(1).strokeColor(border).stroke();
      const detailsY = doc.y + 15;
      doc.fillColor(textMain).font('Helvetica-Bold').fontSize(10).text('BILL TO:', 70, detailsY);
      doc.font('Helvetica').text(user.name, 70, detailsY + 15);
      doc.text(user.email, 70, detailsY + 30);
      
      doc.font('Helvetica-Bold').text('BOOKING ID:', 350, detailsY);
      doc.font('Helvetica').text(`#${booking.id.toUpperCase()}`, 350, detailsY + 15);
      doc.moveDown(6);

      // Table Header
      const tableTop = doc.y;
      doc.rect(50, tableTop, 500, 25).fill('#f8fafc');
      doc.fillColor(textMain).font('Helvetica-Bold').fontSize(10);
      doc.text('DESCRIPTION', 70, tableTop + 8);
      doc.text('AMOUNT', 450, tableTop + 8);
      doc.moveDown(1);

      // Items
      const itemY = doc.y + 10;
      doc.font('Helvetica').text(`Ticket Cancellation: ${event.title}`, 70, itemY);
      doc.text(`$${Number(booking.amountPaid).toFixed(2)}`, 450, itemY);
      
      doc.moveDown(1);
      doc.font('Helvetica-Oblique').fontSize(9).text(`Refund Policy: 75% of base price`, 70, doc.y);

      // Summary
      doc.moveDown(3);
      const summaryX = 350;
      doc.fontSize(10).font('Helvetica').text('Original Paid:', summaryX, doc.y);
      doc.text(`$${Number(booking.amountPaid).toFixed(2)}`, 480, doc.y - 12, { align: 'right' });
      
      doc.moveDown(0.5);
      doc.fillColor(primary).text('Handling Fee (25%):', summaryX, doc.y);
      doc.text(`-$${(booking.amountPaid * 0.25).toFixed(2)}`, 480, doc.y - 12, { align: 'right' });

      doc.moveDown(1);
      doc.rect(summaryX, doc.y, 200, 1).fill(border);
      doc.moveDown(0.5);
      
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#10b981').text('NET REFUND:', summaryX, doc.y);
      doc.text(`$${(booking.amountPaid * 0.75).toFixed(2)}`, 480, doc.y - 14, { align: 'right' });

      // Footer Note
      doc.moveDown(10);
      doc.fontSize(9).font('Helvetica').fillColor(textMuted).text('Note: The 25% deduction covers Platform Handling, Payment Gateway fees, and administrative costs. This refund has been initiated and may take 5-10 business days to reflect in your account.', { align: 'center', width: 440 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
