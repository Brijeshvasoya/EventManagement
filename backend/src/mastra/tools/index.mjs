import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const BACKEND_URL = 'https://backend-production-2a4d2.up.railway.app';

const fetchGraphQL = async (query, variables = {}, token = '') => {
  const response = await fetch(`${BACKEND_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
};

export const getUpcomingEvents = createTool({
  id: 'getUpcomingEvents',
  description: 'Get a list of all upcoming events on EventHub.',
  inputSchema: z.object({}),
  execute: async () => {
    const query = `
      query GetEvents {
        events {
          id title date location imageUrl eventType
        }
      }
    `;
    const data = await fetchGraphQL(query);
    const now = new Date();
    return data.events.filter(e => new Date(isNaN(Number(e.date)) ? e.date : Number(e.date)) >= now);
  },
});

export const getMyBookings = createTool({
  id: 'getMyBookings',
  description: 'Get the bookings of the currently logged-in user.',
  inputSchema: z.object({}),
  execute: async ({ context }) => {
    const token = context?.token;
    if (!token) throw new Error('User not authenticated');

    const query = `
      query GetMyBookings {
        myBookings {
          id status ticketType quantity
          event { id title date location }
        }
      }
    `;
    return await fetchGraphQL(query, {}, token);
  },
});

export const getEventDetails = createTool({
  id: 'getEventDetails',
  description: 'Get detailed information about a specific event by its ID.',
  inputSchema: z.object({
    eventId: z.string().describe('The ID of the event to fetch details for'),
  }),
  execute: async ({ input }) => {
    const query = `
      query GetEventDetails($id: ID!) {
        event(id: $id) {
          id title description date location capacity imageUrl eventType status bookedCount
          ticketTypes { name price capacity }
          organizer { name }
        }
      }
    `;
    return await fetchGraphQL(query, { id: input.eventId });
  },
});

export const getMyEvents = createTool({
  id: 'getMyEvents',
  description: 'Get all events created by the current organizer including sales data, booking counts, and event performance. Use this when user asks about their events, sales data, or wants to see all their events with performance metrics.',
  inputSchema: z.object({}),
  execute: async ({ context }) => {
    const token = context?.token;
    if (!token) throw new Error('User not authenticated');

    const query = `
      query GetMyEvents {
        myEvents {
          id title date location status imageUrl eventType bookedCount
          ticketTypes { name price capacity }
        }
      }
    `;
    return await fetchGraphQL(query, {}, token);
  },
});

export const getSalesAnalytics = createTool({
  id: 'getSalesAnalytics',
  description: 'Get comprehensive sales analytics, revenue data, booking statistics, and performance metrics for all organizer events. Use this when user asks about sales, revenue, analytics, performance, earnings, or business metrics.',
  inputSchema: z.object({}),
  execute: async ({ context }) => {
    const token = context?.token;
    if (!token) throw new Error('User not authenticated');

    const query = `
      query GetMyEvents {
        myEvents {
          id title date location status bookedCount
          ticketTypes { name price capacity }
        }
      }
    `;
    const events = await fetchGraphQL(query, {}, token);
    
    // Calculate sales analytics
    const analytics = events.myEvents.map(event => {
      const totalCapacity = event.ticketTypes.reduce((sum, type) => sum + type.capacity, 0);
      const totalRevenue = event.ticketTypes.reduce((sum, type) => {
        const soldTickets = Math.min(type.capacity, event.bookedCount || 0);
        return sum + (soldTickets * type.price);
      }, 0);
      
      return {
        id: event.id,
        title: event.title,
        date: event.date,
        location: event.location,
        status: event.status,
        totalBookings: event.bookedCount || 0,
        totalCapacity,
        totalRevenue,
        occupancyRate: totalCapacity > 0 ? ((event.bookedCount || 0) / totalCapacity * 100).toFixed(1) : '0',
      };
    });

    return {
      events: analytics,
      summary: {
        totalEvents: analytics.length,
        totalBookings: analytics.reduce((sum, e) => sum + e.totalBookings, 0),
        totalRevenue: analytics.reduce((sum, e) => sum + e.totalRevenue, 0),
        averageOccupancy: analytics.length > 0 ? 
          (analytics.reduce((sum, e) => sum + parseFloat(e.occupancyRate), 0) / analytics.length).toFixed(1) : '0'
      }
    };
  },
});
