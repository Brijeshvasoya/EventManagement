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
const { startReminderCron, runReminderJob } = require('./utils/reminderCron');



const { createServer } = require('http');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/use/ws');

connectDB();

const startServer = async () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors());

  // STRIPE WEBHOOK
  const webhookHandler = require('./modules/payments/webhookHandler');
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), webhookHandler.stripeWebhook);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Helper endpoints
  const { generateEventDescription, generateEventImagePrompt } = require('./utils/ai');
  const { upload, cloudinary } = require('./utils/cloudinary');
  // ... (rest of the helper endpoints from original server.js)

  // AI & MEDIA ENDPOINTS (Module 11 & 14)
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
      const uploadStream = () => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({ folder: 'events_hub' }, (error, result) => {
            if (result) resolve(result); else reject(error);
          });
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

  app.get('/api/tickets/download/:bookingId', async (req, res) => {
    try {
      const { bookingId } = req.params;
      const booking = await Booking.findById(bookingId).populate('user event');
      if (!booking) return res.status(404).send('Booking not found.');
      const pdfBuffer = await generateTicketPDF(booking.user, booking, booking.event);
      const fileName = `Ticket_${booking.event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${bookingId.slice(-6)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).send('Download Error');
    }
  });

  app.get('/api/tickets/qr/:bookingId', async (req, res) => {
    try {
      const { bookingId } = req.params;
      const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
      const downloadUrl = `${BACKEND_URL}/api/tickets/download/${bookingId}`;
      const qrBuffer = await QRCode.toBuffer(downloadUrl, { errorCorrectionLevel: 'H', margin: 1, width: 300 });
      res.setHeader('Content-Type', 'image/png');
      res.send(qrBuffer);
    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });

  app.post('/api/cron/run-reminders', async (req, res) => {
    const secret = req.query.secret || req.body.secret;
    if (secret !== (process.env.CRON_SECRET || 'dev-secret-123')) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const result = await runReminderJob();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
  app.use(limiter);

  // START APOLLO WITH SUBSCRIPTIONS
  const httpServer = createServer(app);
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const serverCleanup = useServer({ 
    schema,
    onConnect: (ctx) => {
      console.log('🚀 WebSocket Connected');
    },
    onDisconnect: (ctx) => {
      console.log('❌ WebSocket Disconnected');
    },
    onSubscribe: (ctx, msg) => {
      console.log('📡 subscription requested:', msg.payload.operationName || 'unnamed');
    },
    onError: (ctx, msg, errors) => {
      console.error('⚠️ WebSocket Error:', errors);
    },
    context: (ctx) => {
      // Handle subscription auth
      const connectionParams = ctx.connectionParams;
      let user = null;
      if (connectionParams && connectionParams.authorization) {
        const token = connectionParams.authorization.split(' ')[1];
        try {
          user = verifyToken(token);
          console.log(`👤 Subscription Auth: ${user.name} (${user.role})`);
        } catch (e) {
          console.log('⚠️ Subscription Auth Failed:', e.message);
        }
      }
      return { user, loaders: createLoaders() };
    }
  }, wsServer);

  // Keep-alive heartbeat (30s) to prevent Railway/Production timeouts
  setInterval(() => {
    wsServer.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.ping();
      }
    });
  }, 30000);

  const server = new ApolloServer({
    schema,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
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
            user = verifyToken(authHeader.split(' ')[1]);
          } catch (e) {}
        }
        return { user, loaders: createLoaders() };
      },
    })
  );

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`);
    startReminderCron();
  });
};

startServer();
