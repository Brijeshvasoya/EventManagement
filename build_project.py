import os

project_path = r"d:\event-management-app"

files = {
    # ------------------ BACKEND ------------------
    "backend/package.json": """{
  "name": "backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "@apollo/server": "^4.10.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dataloader": "^2.2.2",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "express-rate-limit": "^7.2.0",
    "graphql": "^16.8.1",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.3.2"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}""",
    
    "backend/src/server.js": """const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4'); // IMPORTANT: use express4
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');
const createLoaders = require('./loaders');
const { verifyToken } = require('./utils/jwt');

dotenv.config();
connectDB();

const startServer = async () => {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // Basic rate limiting
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
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
          loaders: createLoaders(),
        };
      },
    })
  );

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
};

startServer();""",

    "backend/src/config/db.js": """const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-db');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};
module.exports = connectDB;""",

    "backend/src/models/User.js": """const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ORGANIZER', 'ADMIN'], default: 'USER' }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);""",

    "backend/src/models/Event.js": """const mongoose = require('mongoose');
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true, index: true },
  location: { type: String, required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  capacity: { type: Number, required: true, default: 100 }
}, { timestamps: true });
module.exports = mongoose.model('Event', eventSchema);""",

    "backend/src/models/Booking.js": """const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' }
}, { timestamps: true });
bookingSchema.index({ event: 1, user: 1 }, { unique: true });
module.exports = mongoose.model('Booking', bookingSchema);""",

    "backend/src/utils/jwt.js": """const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecret';
exports.signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '1d' });
exports.verifyToken = (token) => jwt.verify(token, SECRET);""",

    "backend/src/utils/authGuard.js": """const { GraphQLError } = require('graphql');
exports.requireAuth = (user) => {
  if (!user) throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
};
exports.requireRole = (user, roles) => {
  exports.requireAuth(user);
  if (!roles.includes(user.role)) {
    throw new GraphQLError('Forbidden: insufficient permissions', { extensions: { code: 'FORBIDDEN' } });
  }
};""",

    "backend/src/loaders/index.js": """const DataLoader = require('dataloader');
const User = require('../models/User');
const Event = require('../models/Event');

module.exports = () => ({
  userLoader: new DataLoader(async (userIds) => {
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
    return userIds.map(id => userMap[id] || null);
  }),
  eventLoader: new DataLoader(async (eventIds) => {
    const events = await Event.find({ _id: { $in: eventIds } });
    const eventMap = events.reduce((acc, e) => ({ ...acc, [e.id]: e }), {});
    return eventIds.map(id => eventMap[id] || null);
  })
});""",

    "backend/src/graphql/typeDefs.js": """const typeDefs = `#graphql
  type User { id: ID! name: String! email: String! role: String! }
  type Event { id: ID! title: String! description: String! date: String! location: String! capacity: Int! organizer: User! isBooked: Boolean }
  type Booking { id: ID! event: Event! user: User! status: String! createdAt: String! }
  type AuthPayload { token: String! user: User! }
  
  input CreateEventInput { title: String! description: String! date: String! location: String! capacity: Int }
  
  type Query {
    me: User
    events(limit: Int, offset: Int): [Event!]!
    event(id: ID!): Event
    myBookings: [Booking!]!
  }
  
  type Mutation {
    register(name: String!, email: String!, password: String!, role: String): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createEvent(input: CreateEventInput!): Event!
    bookEvent(eventId: ID!): Booking!
    cancelBooking(bookingId: ID!): Boolean!
  }
`;
module.exports = typeDefs;""",

    "backend/src/graphql/resolvers.js": """const { GraphQLError } = require('graphql');
const authService = require('../modules/auth/authService');
const eventService = require('../modules/events/eventService');
const bookingService = require('../modules/bookings/bookingService');

const resolvers = {
  Query: {
    me: (_, __, { user }) => authService.getMe(user),
    events: (_, args, context) => eventService.getEvents(args, context),
    event: (_, { id }) => eventService.getEventById(id),
    myBookings: (_, __, { user }) => bookingService.getMyBookings(user)
  },
  Mutation: {
    register: (_, args) => authService.register(args),
    login: (_, args) => authService.login(args),
    createEvent: (_, { input }, { user }) => eventService.createEvent(input, user),
    bookEvent: (_, { eventId }, { user }) => bookingService.bookEvent(eventId, user),
    cancelBooking: (_, { bookingId }, { user }) => bookingService.cancelBooking(bookingId, user)
  },
  Event: {
    organizer: (parent, _, { loaders }) => loaders.userLoader.load(parent.organizer.toString()),
    isBooked: async (parent, _, { user }) => {
      if (!user) return false;
      return bookingService.checkIfBooked(parent.id, user.id);
    }
  },
  Booking: {
    event: (parent, _, { loaders }) => loaders.eventLoader.load(parent.event.toString()),
    user: (parent, _, { loaders }) => loaders.userLoader.load(parent.user.toString())
  }
};
module.exports = resolvers;""",

    "backend/src/modules/auth/authService.js": """const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const { signToken } = require('../../utils/jwt');
const { GraphQLError } = require('graphql');

exports.register = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new GraphQLError('User already exists');
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashedPassword, role: role || 'USER' });
  return { token: signToken({ id: user.id, role: user.role }), user };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new GraphQLError('Invalid credentials', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return { token: signToken({ id: user.id, role: user.role }), user };
};

exports.getMe = async (user) => {
  if (!user) return null;
  return User.findById(user.id);
};""",

    "backend/src/modules/events/eventService.js": """const Event = require('../../models/Event');
const { requireRole } = require('../../utils/authGuard');

exports.getEvents = async ({ limit = 50, offset = 0 }) => {
  return Event.find().sort({ date: -1 }).skip(offset).limit(limit);
};

exports.getEventById = async (id) => Event.findById(id);

exports.createEvent = async (input, user) => {
  requireRole(user, ['ORGANIZER', 'ADMIN']);
  const event = new Event({ ...input, organizer: user.id });
  await event.save();
  return event;
};""",

    "backend/src/modules/bookings/bookingService.js": """const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const { requireAuth } = require('../../utils/authGuard');
const { GraphQLError } = require('graphql');

exports.getMyBookings = async (user) => {
  requireAuth(user);
  return Booking.find({ user: user.id }).sort({ createdAt: -1 });
};

exports.bookEvent = async (eventId, user) => {
  requireAuth(user);
  const event = await Event.findById(eventId);
  if (!event) throw new GraphQLError('Event not found');
  
  const existing = await Booking.findOne({ event: eventId, user: user.id });
  if (existing && existing.status === 'CONFIRMED') throw new GraphQLError('Already booked');
  if (existing) {
    existing.status = 'CONFIRMED';
    await existing.save();
    return existing;
  }
  
  const bookingsCount = await Booking.countDocuments({ event: eventId, status: 'CONFIRMED' });
  if (bookingsCount >= event.capacity) throw new GraphQLError('Event is full');
  
  return Booking.create({ event: eventId, user: user.id });
};

exports.cancelBooking = async (bookingId, user) => {
  requireAuth(user);
  const booking = await Booking.findOne({ _id: bookingId, user: user.id });
  if (!booking) throw new GraphQLError('Booking not found');
  booking.status = 'CANCELLED';
  await booking.save();
  return true;
};

exports.checkIfBooked = async (eventId, userId) => {
  const b = await Booking.findOne({ event: eventId, user: userId, status: 'CONFIRMED' });
  return !!b;
};""",

    # ------------------ FRONTEND ------------------
    "frontend/package.json": """{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": {
    "@apollo/client": "^3.10.3",
    "graphql": "^16.8.1",
    "jwt-decode": "^4.0.0",
    "next": "14.2.3",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.4.1"
  }
}""",
    
    "frontend/src/lib/apolloClient.js": """import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({ uri: 'http://localhost:4000/graphql' });

const authLink = setContext((_, { headers }) => {
  let token;
  if (typeof window !== 'undefined') token = localStorage.getItem('token');
  return { headers: { ...headers, authorization: token ? `Bearer ${token}` : '' } };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

export default client;""",

    "frontend/src/context/AuthContext.js": """import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApolloClient } from '@apollo/client';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const apolloClient = useApolloClient();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) throw new Error('Expired');
        setUser({ id: decoded.id, role: decoded.role });
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, returnUrl = '/') => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode(token);
    setUser({ id: decoded.id, role: decoded.role });
    router.push(returnUrl);
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    await apolloClient.resetStore();
    router.push('/login');
  };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);""",

    "frontend/src/pages/_app.js": """import { ApolloProvider } from '@apollo/client';
import client from '@/lib/apolloClient';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <Toaster position="top-center" />
        <Component {...pageProps} />
      </AuthProvider>
    </ApolloProvider>
  );
}""",

    "frontend/src/pages/index.js": """import Head from 'next/head';
import { EventList } from '@/features/events/components/EventList';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Home() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;

  return (
    <>
      <Head>
        <title>EventHub | Dashboard</title>
      </Head>
      <main className="container">
        <header className="header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '2rem 0'}}>
          <h1>EventHub.</h1>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            {user ? (
              <>
                {(user.role === 'ORGANIZER' || user.role === 'ADMIN') && (
                  <button onClick={() => router.push('/events/create')} style={{padding: '0.5rem 1rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>+ Create Event</button>
                )}
                <Link href="/dashboard" style={{textDecoration: 'none', color: '#333'}}>My Dashboard</Link>
                <button onClick={logout} style={{padding: '0.5rem 1rem'}}>Logout</button>
              </>
            ) : (
              <>
                <Link href="/login">Login</Link>
                <Link href="/signup">Sign Up</Link>
              </>
            )}
          </div>
        </header>
        <EventList />
      </main>
    </>
  );
}""",

    "frontend/src/features/events/graphql/queries.js": """import { gql } from '@apollo/client';

export const GET_EVENTS = gql`
  query GetEvents($limit: Int, $offset: Int) {
    events(limit: $limit, offset: $offset) {
      id title description date location capacity
      organizer { name }
      isBooked
    }
  }
`;
export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) { id title }
  }
`;
export const BOOK_EVENT = gql`
  mutation BookEvent($id: ID!) {
    bookEvent(eventId: $id) { id status }
  }
`;
export const CANCEL_BOOKING = gql`
  mutation CancelBooking($id: ID!) {
    cancelBooking(bookingId: $id)
  }
`;
export const GET_MY_BOOKINGS = gql`
  query GetMyBookings {
    myBookings {
      id status
      event { id title date location organizer { name } }
    }
  }
`;""",

    "frontend/src/features/events/hooks/useEvents.js": """import { useQuery, useMutation } from '@apollo/client';
import { GET_EVENTS, BOOK_EVENT } from '../graphql/queries';
import toast from 'react-hot-toast';

export const useEvents = () => {
  const { data, loading, error, refetch } = useQuery(GET_EVENTS, { 
    variables: { limit: 50, offset: 0 },
    fetchPolicy: 'cache-and-network'
  });
  
  const [bookEventMutation] = useMutation(BOOK_EVENT, {
    refetchQueries: [{ query: GET_EVENTS }]
  });

  const handleBook = async (eventId) => {
    try {
      await bookEventMutation({ variables: { id: eventId } });
      toast.success('Successfully booked!');
    } catch (e) {
      toast.error(e.message || 'Failed to book');
    }
  };

  return { events: data?.events || [], loading, error, refetch, handleBook };
};""",

    "frontend/src/features/events/components/EventList.js": """import React from 'react';
import { useEvents } from '../hooks/useEvents';
import EventCard from './EventCard';

export const EventList = () => {
  const { events, loading, error, handleBook } = useEvents();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading events.</div>;
  if (!events.length) return <p>No events found.</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
      {events.map((e) => (
        <EventCard key={e.id} event={e} onBook={() => handleBook(e.id)} />
      ))}
    </div>
  );
};""",

    "frontend/src/features/events/components/EventCard.js": """import React from 'react';
import { useAuth } from '@/context/AuthContext';

const EventCard = React.memo(({ event, onBook }) => {
  const { user } = useAuth();
  return (
    <div style={{ border: '1px solid #eaeaea', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h2 style={{marginTop:0}}>{event.title}</h2>
      <p style={{color: '#666', fontSize: '0.9rem'}}>{new Date(parseInt(event.date) || event.date).toLocaleDateString()} • {event.location}</p>
      <p>{event.description}</p>
      <p style={{fontSize: '0.8rem', background: '#eee', display: 'inline-block', padding: '2px 8px', borderRadius: '4px'}}>By {event.organizer.name}</p>
      
      {user && (
        <div style={{marginTop: '1rem'}}>
          {event.isBooked ? (
            <button disabled style={{background: '#4CAF50', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px'}}>✓ Booked</button>
          ) : (
            <button onClick={onBook} style={{background: '#0070f3', cursor: 'pointer', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px'}}>Book Ticket</button>
          )}
        </div>
      )}
    </div>
  );
});
EventCard.displayName = 'EventCard';
export default EventCard;""",

    "frontend/src/pages/login.js": """import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) { token user { id name role } }
  }
`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const [loginM, { loading }] = useMutation(LOGIN_MUTATION);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await loginM({ variables: { email, password } });
      toast.success('Logged in!');
      login(data.login.token);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{maxWidth: '400px', margin: '100px auto', padding: '2rem', border: '1px solid #ccc', borderRadius:'8px'}}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={{padding:'0.5rem'}}/>
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required style={{padding:'0.5rem'}}/>
        <button type="submit" disabled={loading} style={{padding:'0.5rem', background: '#0070f3', color:'white', border:'none', cursor:'pointer'}}>{loading ? '...' : 'Login'}</button>
      </form>
    </div>
  );
}""",

    "frontend/src/pages/dashboard.js": """import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_BOOKINGS, CANCEL_BOOKING } from '@/features/events/graphql/queries';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { data, loading, error, refetch } = useQuery(GET_MY_BOOKINGS, { skip: !user, fetchPolicy: 'cache-and-network' });
  const [cancel] = useMutation(CANCEL_BOOKING);

  if (authLoading || loading) return <div>Loading...</div>;
  if (!user) { router.push('/login'); return null; }

  const handleCancel = async (id) => {
    if(confirm('Cancel booking?')){
      try{ await cancel({variables:{id}}); toast.success('Cancelled'); refetch(); } 
      catch(e) { toast.error(e.message); }
    }
  };

  return (
    <main className="container" style={{padding: '2rem'}}>
      <h1>My Dashboard</h1>
      <Link href="/">← Back to Events</Link>
      
      <h2 style={{marginTop: '2rem'}}>My Bookings</h2>
      {error && <p>Error loading bookings</p>}
      {!data?.myBookings?.length && <p>You have no bookings.</p>}
      <ul style={{listStyle:'none', padding:0}}>
        {data?.myBookings?.map(b => (
          <li key={b.id} style={{padding: '1rem', border: '1px solid #ddd', marginBottom:'1rem', borderRadius:'8px'}}>
            <h3>{b.event.title} <span style={{fontSize:'0.8rem', color: b.status==='CONFIRMED'?'green':'red'}}>({b.status})</span></h3>
            <p>{b.event.location} • {new Date(parseInt(b.event.date)||b.event.date).toLocaleDateString()}</p>
            {b.status === 'CONFIRMED' && <button onClick={()=>handleCancel(b.id)} style={{color:'red'}}>Cancel</button>}
          </li>
        ))}
      </ul>
    </main>
  );
}""",

    "frontend/src/pages/events/create.js": """import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_EVENT } from '@/features/events/graphql/queries';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function CreateEvent() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '', capacity: 100 });
  const [createEvent, { loading }] = useMutation(CREATE_EVENT);

  if (!user || user.role === 'USER') { return <p>Access Denied. Organizers only.</p>; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createEvent({ variables: { input: { ...form, capacity: parseInt(form.capacity) } } });
      toast.success('Event Created!');
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div style={{maxWidth: '500px', margin: '50px auto'}}>
      <h2>Create Event</h2>
      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
        <input placeholder="Title" required onChange={e=>setForm({...form, title: e.target.value})} />
        <textarea placeholder="Description" required onChange={e=>setForm({...form, description: e.target.value})} rows={4} />
        <input type="datetime-local" required onChange={e=>setForm({...form, date: e.target.value})} />
        <input placeholder="Location" required onChange={e=>setForm({...form, location: e.target.value})} />
        <input type="number" placeholder="Capacity" required value={form.capacity} onChange={e=>setForm({...form, capacity: e.target.value})} />
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create Event'}</button>
      </form>
    </div>
  );
}"""
}

for filepath, content in files.items():
    full_path = os.path.join(project_path, filepath)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf8") as f:
        f.write(content)

print(f"✅ Generated {len(files)} files successfully at {project_path}")
