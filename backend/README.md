# EventHub Backend - GraphQL API

The robust backend engine for the EventHub platform, providing a high-performance GraphQL API for event management, authentication, and platform analytics.

## 🚀 Key Technologies

- **Server**: Node.js & Express
- **API**: GraphQL (Apollo Server)
- **Database**: MongoDB (via Mongoose)
- **AI Engine**: Mastra & Mistral AI
- **Payments**: Stripe SDK
- **File Storage**: Cloudinary (via Multer)
- **Email**: Nodemailer

## 🛠️ Features

- **GraphQL API**: Unified endpoint for all platform operations with comprehensive type definitions.
- **Role-Based Authentication**: Secure JWT-based auth for Users, Organizers, and Admins.
- **Analytics Service**: Real-time aggregation of sales data and platform metrics.
- **Payment Processing**: Secure Stripe integration for ticket purchases and subscription plans.
- **AI Integration**: Mastra-powered agents for contextual event queries.
- **Real-time Notifications**: Subscription-based notification system.

## ⚙️ Setup & Installation

1. Navigate to the backend directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file with the following:
   ```env
   PORT=4000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   STRIPE_SECRET_KEY=your_stripe_secret
   CLOUDINARY_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   MISTRAL_API_KEY=your_mistral_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📚 API Documentation

Once the server is running, you can access the Apollo Sandbox (GraphQL Playground) at:
`http://localhost:4000/graphql`
