# 🎪 EventHub Frontend

**Elevate your event management experience with EventHub.** This repository contains the high-fidelity frontend application built with Next.js, meticulously crafted for performance and aesthetic excellence.

---

## 🌟 Key Features

### 🏢 For Organizers
- **Intelligent Dashboard**: Real-time sales insights, revenue analytics, and attendee distribution charts.
- **Roster Management**: Export attendee lists to Excel and track guest statuses (Confirmed, Checked-in, Cancelled).
- **Gatekeeper Tools**: Integrated QR scanning for rapid venue entry and ticket verification.
- **Promo Engine**: Create and manage dynamic discount codes to drive sales.

### 👥 For Attendees
- **Seamless Discovery**: Browse events with advanced filtering and vibrant category tags.
- **Secure Checkout**: Stripe-integrated ticket purchasing with instant confirmation.
- **Digital Passes**: Premium digital tickets with unique QR codes, downloadable as high-quality PDFs.
- **AI Chatbot**: Context-aware assistance for finding events and navigating the platform.
- **Rewards System**: Earn loyalty points with every booking and unlock exclusive perks.

---

## 🛠️ Technology Stack

- **Core**: [Next.js](https://nextjs.org) 14+ (Pages Router)
- **UI Framework**: [Ant Design](https://ant.design) for robust, accessible components.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for fluid, premium transitions.
- **Data Fetching**: [Apollo Client](https://www.apollographql.com/docs/react/) for GraphQL interaction.
- **Payments**: [Stripe](https://stripe.com) for secure transactions.
- **AI Integration**: [Mistral AI](https://mistral.ai) & [Mastra](https://mastra.ai).

---

## 📁 Directory Structure

```text
src/
├── components/   # Reusable global UI elements
├── context/      # Authentication & Global State providers
├── features/     # Feature-specific components, queries & mutations
├── lib/          # Utilities, constants, and helper functions
├── pages/        # Next.js routing and page components
└── styles/       # Global CSS and Design System tokens
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18 or later
- **Backend**: Running instance of the EventHub Backend

### 2. Installation
```bash
git clone <repository-url>
cd frontend
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 4. Launch
```bash
npm run dev
```
Visit `http://localhost:3000` to see the magic. ✨

---

## 📦 Available Scripts

- `npm run dev`: Start development server with hot-reloading.
- `npm run build`: Generate a production-optimized build.
- `npm run start`: Run the production server.
- `npm run lint`: Run ESLint for code quality checks.

---

## 🎨 Design Philosophy
EventHub is built on a **Rich Aesthetic** foundation:
- **Glassmorphism**: Subtle blurs and translucent layers for a modern feel.
- **Micro-interactions**: Interactive hover states and spring-based animations.
- **Accessibility**: Semantic HTML and full keyboard navigation support.
- **Responsive**: Fluid layouts that look stunning from mobile to ultra-wide displays.

---

## 📄 License
This project is proprietary. All rights reserved.
