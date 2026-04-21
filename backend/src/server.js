const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const createLoaders = require('./loaders');
const { verifyToken } = require('./utils/jwt');
const Booking = require('./models/Booking');
const User = require('./models/User');
const Event = require('./models/Event');
const { generateTicketPDF } = require('./utils/pdfGenerator');
const QRCode = require('qrcode');



connectDB();

const startServer = async () => {
  const app = express();
  app.set('trust proxy', 1);

  app.use(cors());

  // STRIPE WEBHOOK (Must be raw body parsing strictly before express.json catches it)
  const webhookHandler = require('./modules/payments/webhookHandler');
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookHandler.stripeWebhook);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // AI & MEDIA ENDPOINTS (Module 11 & 14)
  const { generateEventDescription, generateEventImagePrompt } = require('./utils/ai');
  const { upload, cloudinary } = require('./utils/cloudinary');

  app.post('/api/ai/generate', async (req, res) => {
    const { title, eventType } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    try {
      const description = await generateEventDescription(title, eventType);
      res.json({ description });
    } catch (e) {
      res.status(500).json({ error: 'AI error' });
    }
  });

  app.post('/api/ai/generate-image', async (req, res) => {
    const { title, eventType } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    try {
      const rawPrompt = await generateEventImagePrompt(title, eventType);
      const prompt = rawPrompt.replace(/["'#\n\r*]/g, ' ').trim();
      const safePrompt = encodeURIComponent(prompt);
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${safePrompt}?width=1024&height=1024&nologo=true&model=flux&seed=${Math.floor(Math.random() * 1000000)}`;

      const imageRes = await fetch(pollinationsUrl);
      if (!imageRes.ok) throw new Error('Failed to fetch image from AI generator');

      const arrayBuffer = await imageRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload buffer to Cloudinary
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'events_hub' },
            (error, result) => {
              if (result) resolve(result);
              else reject(error);
            }
          );
          stream.end(buffer);
        });
      };

      const uploadResult = await uploadStream();
      res.json({ imageUrl: uploadResult.secure_url, prompt });
    } catch (e) {
      console.error('AI Image Generation Failed:', e);
      res.status(500).json({ error: 'AI Image Error' });
    }
  });

  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });
    res.json({ url: req.file.path });
  });

  // Ticket Download Route
  app.get('/api/tickets/download/:bookingId', async (req, res) => {
    try {
      const { bookingId } = req.params;
      console.log(`📡 Attempting ticket download for Booking ID: ${bookingId}`);

      const booking = await Booking.findById(bookingId).populate('user event');
      if (!booking) {
        console.error(`❌ Booking ${bookingId} not found`);
        return res.status(404).send('Ticket Download Failed: Booking not found.');
      }

      console.log(`📄 Generating PDF for ${booking.user.name} - ${booking.event.title}`);
      const pdfBuffer = await generateTicketPDF(booking.user, booking, booking.event);

      const fileName = `Ticket_${booking.event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${bookingId.slice(-6)}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log(`✅ Sending PDF: ${fileName} (${pdfBuffer.length} bytes)`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('❌ Download error:', error);
      res.status(500).send('Download Error: Failed to generate ticket PDF.');
    }
  });



  // QR Code Generation Route (for public access in emails)
  app.get('/api/tickets/qr/:bookingId', async (req, res) => {
    try {
      const { bookingId } = req.params;
      const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
      const downloadUrl = `${BACKEND_URL}/api/tickets/download/${bookingId}`;
      
      const qrBuffer = await QRCode.toBuffer(downloadUrl, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 300
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); 
      res.send(qrBuffer);
    } catch (error) {

      console.error('QR generation error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Prevent abuse & brute force (200 requests per 15 minutes)

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: (err) => {
      console.error('GraphQL Error:', err.message);
      return err;
    },
  });

  await server.start();

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        let user = null;
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.split(' ')[1];
            user = verifyToken(token);
          } catch (e) {
            console.error('Auth Context Error:', e.message);
          }
        }
        return {
          user,
          loaders: createLoaders(), // Provides fresh DataLoader per request (Solves N+1)
        };
      },
    })
  );

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at ${process.env.BACKEND_URL}:${PORT}/graphql`);
  });
};

startServer();
