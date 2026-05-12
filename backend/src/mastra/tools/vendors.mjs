import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const vendorCoordinationTool = createTool({
  id: 'vendor-coordination',
  description: 'Coordinate and manage event vendors and services',
  inputSchema: z.object({
    action: z.enum(['find-vendors', 'coordinate-vendors', 'track-vendors', 'evaluate-vendors']).describe('Action to perform'),
    eventType: z.string().describe('Type of event'),
    budget: z.number().optional().describe('Total budget for vendor services'),
    location: z.string().optional().describe('Event location'),
  }),
  execute: async ({ input }) => {
    const { action, eventType, budget = 5000, location = 'City Center' } = input;
    
    if (action === 'find-vendors') {
      const categories = ['Caterer', 'Photographer', 'Venue', 'Entertainment'];
      const vendors = categories.map(cat => ({
        name: `${location} ${cat} Pros`,
        category: cat,
        rating: 4.5,
        price: Math.round(budget * 0.2),
        contact: `hello@${cat.toLowerCase()}pros.com`,
        services: [`Premium ${cat} services`],
        availability: 'Available',
        reviews: 120
      }));

      return {
        vendors,
        recommendations: ['Get 3 quotes', 'Check portfolios']
      };
    }

    return {
      message: `${action} initiated for ${eventType}`,
      status: 'In Progress'
    };
  },
});
