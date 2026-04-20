# 🔍 Architecture Review & Enhancement Plan

## 1. Overall Project Architecture Assessment
- **Current State:** The application works as a basic monolithic prototype. The frontend mixes UI and data fetching, and the backend has tightly coupled GraphQL resolvers and database models without intermediate service layers.
- **Issues:** 
  - **Tight Coupling:** Resolvers directly deal with MongoDB using Mongoose models and handle authentication logic (JWT generation/verification).
  - **No Separation of Concerns:** Database access, domain logic, and API presentation are all in one layer.
  - **Overfetching:** MongoDB `populate` is used regardless of whether the client requests relational data.
- **Recommendations:**
  - Introduce a **Service Layer** to isolate business logic from GraphQL resolvers.
  - Introduce a **Data Access Layer** or use **DataLoaders** to abstract database queries and prevent N+1 issues.
  - Transition the Next.js frontend towards a feature-based structure to make the codebase maintainable as it scales.

---

## 2. ⚡ Performance Optimization

### Frontend (Next.js & Apollo)
* **Re-renders & Component Structure:** 
  * Currently, the data fetching logic (`useQuery`) is placed directly inside `Home`. If any state updates in `Home`, the entire grid re-renders.
  * *Fix:* Extract the Event List and Event Card into separate components (`<EventList />`, `<EventCard />`) utilizing `React.memo` if necessary.
* **Apollo Client Cache:** 
  * Ensure `@apollo/client` is configured with `typePolicies` for correct cache updates after mutations (like `createEvent`). Without proper ID mapping, the client might trigger unnecessary network requests.
* **State Management:** 
  * Abstract GraphQL queries into custom hooks (e.g., `useEvents()`) to keep components clean.

### Backend (GraphQL & MongoDB)
* **Overfetching (The N+1 Problem):**
  * Your `events` query currently does `Event.find().populate('organizer')`. If the client only asks for `id` and `title`, you are needlessly fetching User documents from the database.
  * *Fix:* Remove Mongoose `.populate()`. Instead, define an `organizer` field resolver on the `Event` type and use **DataLoader** to batch and cache User queries.
* **Pagination:**
  * `Event.find()` fetches all items. This will crash the server when you hit thousands of events.
  * *Fix:* Implement cursor-based pagination (e.g., Relay connections) or simple offset/limit pagination on the `events` query.

---

## 3. 🧠 GraphQL Improvements

### Schema Redesign
* **Response Standardization:** 
  * Mutations should return a structured response instead of just the object. e.g., `EventResponse` with `success`, `message`, and `event`. This makes handling errors on the frontend much easier.
* **Input Types:** Provide comprehensive Input types for complex mutations (e.g., filters for `events` query, not just empty arguments).

### Optimized Resolver Example
Instead of `populate`:
```javascript
// src/loaders/userLoader.js
const DataLoader = require('dataloader');
const User = require('../models/User');

const batchUsers = async (userIds) => {
  const users = await User.find({ _id: { $in: userIds } });
  const userMap = users.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});
  return userIds.map(id => userMap[id] || null);
};

module.exports = new DataLoader(batchUsers);
```
```javascript
// Resovler mapping
const resolvers = {
  Query: {
    events: async () => await Event.find() // No populate!
  },
  Event: {
    organizer: async (parent, args, { dataLoaders }) => {
      return await dataLoaders.userLoader.load(parent.organizer.toString());
    }
  }
}
```

---

## 4. 🗂️ Proposed Folder Structure

This highly scalable feature-based structure should be adopted.

### 📁 Frontend (Next.js)
```text
/frontend
 ├── /src
 │    ├── /components    # Shared UI (Buttons, Modals, Forms)
 │    ├── /features      # Feature-based logic (e.g., /features/events, /features/auth)
 │    │    └── /events
 │    │         ├── /components  # Event-specific components (EventCard)
 │    │         ├── /hooks       # e.g., useEvents.js
 │    │         ├── /graphql     # Queries & Mutations (.graphql or .js)
 │    │         └── /services    # Specific formatting or API helpers
 │    ├── /pages         # purely route definitions mapping to feature components
 │    ├── /lib           # Apollo config, global utils
 │    ├── /context       # Global context (e.g., AuthProvider)
 │    ├── /styles        # Global and modular CSS
 │    └── /constants     # Env variables or static text
```

### 📁 Backend (Apollo Server)
```text
/backend
 ├── /src
 │    ├── /modules       # Feature modules containing their own schema/resolvers/services
 │    │    ├── /auth     # login, register logic
 │    │    └── /events   # createEvent, event fetching
 │    │         ├── event.typeDef.js
 │    │         ├── event.resolver.js
 │    │         └── event.service.js
 │    ├── /models        # Mongoose schemas
 │    ├── /loaders       # DataLoaders (UserLoader, etc.)
 │    ├── /middlewares   # Auth verification, rate limiting, logging
 │    ├── /config        # DB config, Apollo Server instantiation
 │    ├── /utils         # Error formatting, standard responses
 │    └── server.js      # App entry point
```

---

## 5. 🚀 Feature Enhancements

To make this a "Next-Gen" platform, here is an implementation roadmap:
1. **Core Missing Features:**
   - **Role-Based Access (RBAC):** Ensure `ADMIN` can delete any event, `ORGANIZER` can only edit their own, `USER` can only view/RSVP.
   - **RSVP / Ticketing System:** A `Booking` model mapping Users to Events, auto-generating a unique QR Code (using a library like `qrcode` or `qrcode.react`).
2. **Growth Features:**
   - **Payment Integration:** Stripe Checkout sessions mapped to an `EventTicket` mutation.
   - **Geo-Search:** Mongoose geospatial indices (`2dsphere`) to search events by proximity.
   - **Rich Media:** Cloudinary or AWS S3 upload integration for Event Banners.
3. **UX Enhancements:**
   - Skeleton loaders instead of plain "Loading events..." text.
   - Infinite scroll using Apollo `fetchMore` functionality.

---

## 6. ⚠️ Anti-Patterns to Fix Immediately

1. **Leaking Auth Errors to Console Only:**
   Your Apollo context block currently `console.log`s invalid tokens but returns `{ user: null }`. You should throw a generic `AuthenticationError` so Apollo passes the error properly to the frontend.
2. **God File Resolvers:**
   `resolvers.js` is currently a monolithic file handling hashing, validation, business logic, DB access, and JWT signing. **Fix:** Move hashing and logic to an `AuthService`.
3. **No Input Validation:**
   Currently relying purely on Mongoose schema rejection. You should validate payloads (e.g., email format, password strength) earlier in the chain using something like `Zod` or `Joi` or GraphQL constraints before saving.
4. **Hardcoded Secrets:**
   Ensure `JWT_SECRET` defaults and fallbacks are securely managed.

---

## 7. 🔐 Production Readiness

* **Security:**
  * Mask unhandled errors from clients in production. Apollo Server v4+ requires explicit formatError handling.
  * Apply `cors` strictly matching your frontend URL.
  * Use `helmet` for Express security headers.
  * Add a Rate Limiting middleware on the `/graphql` route to prevent brute-forcing `login` or spamming `createEvent`.
* **Database Optimization:**
  * Add an index to `email` in User model (`{ email: 1, unique: true }`).
  * Add an index to `date` and `organizer` in Event model for faster queries (`{ date: -1 }`).
* **Deployment:**
  * Containerize Backend via Docker.
  * Use Vercel for Frontend (native Next.js features).
  * Use a managed MongoDB instance (Atlas) with Network Peering/IP Whitelisting.
