const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

exports.generateTicketPDF = async (user, booking, event) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
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

      // --- Background Decoration ---
      // Draw a subtle gradient-like background or a border
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
      
      // Top header bar
      doc.rect(0, 0, doc.page.width, 150).fill('#1e1b4b');

      // --- Header Text ---
      doc.fillColor('#ffffff')
         .fontSize(10)
         .text('OFFICIAL EVENT PASS', 50, 40, { characterSpacing: 2 });
      
      doc.fontSize(32)
         .font('Helvetica-Bold')
         .text(event.title.toUpperCase(), 50, 65, { width: 500 });

      // Ticket ID Badge
      doc.fillColor('#ffffff', 0.1)
         .rect(50, 115, 180, 25)
         .fill();
      
      doc.fillColor('#ffffff', 1)
         .fontSize(10)
         .font('Helvetica')
         .text(`TICKET ID: #${booking.id.slice(-8).toUpperCase()}`, 65, 122);

      // --- Content Section ---
      doc.fillColor('#1e1b4b');
      
      // Guest Detail Label
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#4338ca')
         .text('GUEST NAME', 50, 190);
      
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('#1e293b')
         .text(user.name, 50, 205);

      // Split into two columns
      const col1 = 50;
      const col2 = 300;
      const rowY = 270;

      // Date
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#4338ca')
         .text('DATE & TIME', col1, rowY);
      
      const eventDate = new Date(parseInt(event.date) || event.date);
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#334155')
         .text(eventDate.toLocaleDateString(), col1, rowY + 15);
      
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#64748b')
         .text(eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), col1, rowY + 35);

      // Location
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#4338ca')
         .text('LOCATION', col2, rowY);
      
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .fillColor('#334155')
         .text(event.location, col2, rowY + 15, { width: 250 });

      // Lower Row
      const row2Y = 360;

      // Tier
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#4338ca')
         .text('TICKET TIER', col1, row2Y);
      
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#4f46e5')
         .text(booking.ticketType || 'REGULAR', col1, row2Y + 15);

      // Quantity
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#4338ca')
         .text('QUANTITY', col2, row2Y);
      
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor('#1e293b')
         .text(`${booking.quantity || 1} Person(s)`, col2, row2Y + 15);

      // --- QR Section ---
      doc.rect(50, 450, doc.page.width - 100, 1).fill('#e2e8f0'); // Separator

      // Generate QR Code
      const qrDataUrl = await QRCode.toDataURL(booking.id.toString());
      // QRCode.toDataURL returns "data:image/png;base64,..."
      const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      doc.image(qrImageBuffer, (doc.page.width - 150) / 2, 500, { width: 150 });
      
      doc.fillColor('#1e1b4b')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('SCAN FOR GATE ENTRY', 0, 660, { align: 'center' });

      // Footer
      doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill('#f8fafc');
      doc.fillColor('#94a3b8')
         .fontSize(9)
         .font('Helvetica')
         .text('Verified by EventHub Premium SaaS • Secure Digital Pass', 0, doc.page.height - 25, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
