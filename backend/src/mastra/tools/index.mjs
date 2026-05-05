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
