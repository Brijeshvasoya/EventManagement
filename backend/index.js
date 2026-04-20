const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express5');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const typeDefs = require('./src/graphql/typeDefs');
const resolvers = require('./src/graphql/resolvers');

dotenv.config();

const startServer = async () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Connect Database
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
  }

  // Set up Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  // Initialize data loaders
  const { createUserLoader } = require('./src/loaders/userLoader');

  app.use(
    '/graphql',
    expressMiddleware(server, {
      context: async ({ req }) => {
        let user = null;
        const authHeader = req.headers.authorization || '';

        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          if (token) {
            try {
              user = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
              console.error('Invalid or Expired Token:', err.message);
              // Not throwing here allows unauthenticated queries (like fetching events) to still pass,
              // but authenticated mutations will fail when they check for `user`.
              // We'll throw the error in the resolvers where authentication is strictly required.
            }
          }
        }

        return {
          user,
          dataLoaders: {
            userLoader: createUserLoader()
          }
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
