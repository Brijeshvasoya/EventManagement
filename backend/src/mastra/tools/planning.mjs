import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const eventPlanningTool = createTool({
  id: 'event-planning',
  description: 'Plan and structure events with timelines and milestones',
  inputSchema: z.object({
    eventType: z.string().describe('Type of event (wedding, corporate, birthday, conference, etc.)'),
    guestCount: z.number().describe('Expected number of guests'),
    budget: z.number().describe('Event budget in USD'),
    date: z.string().describe('Event date (YYYY-MM-DD format)'),
    duration: z.string().describe('Event duration (e.g., "4 hours", "2 days")'),
    location: z.string().describe('Event location or city'),
    specialRequirements: z.string().optional().describe('Any special requirements or preferences'),
  }),
  execute: async ({ input }) => {
    const { eventType, guestCount, budget, date, location } = input;
    
    const venuePercentage = 0.35;
    const cateringPercentage = 0.30;
    const decorationPercentage = 0.15;
    const entertainmentPercentage = 0.15;
    const miscellaneousPercentage = 0.05;

    const budgetBreakdown = {
      venue: Math.round(budget * venuePercentage),
      catering: Math.round(budget * cateringPercentage),
      decoration: Math.round(budget * decorationPercentage),
      entertainment: Math.round(budget * entertainmentPercentage),
      miscellaneous: Math.round(budget * miscellaneousPercentage),
    };

    const timeline = generateTimeline(eventType, date);
    const checklist = generateChecklist(eventType, guestCount);
    const recommendations = generateRecommendations(eventType, guestCount, budget, location);

    return {
      timeline,
      budgetBreakdown,
      checklist,
      recommendations,
    };
  },
});

function generateTimeline(eventType, date) {
  const eventDate = new Date(date);
  return [
    {
      phase: 'Planning Phase (3-6 months before)',
      tasks: ['Set budget', 'Create guest list', 'Book venue', 'Hire key vendors'],
      deadline: new Date(eventDate.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'High',
    },
    {
      phase: 'Final Week',
      tasks: ['Confirm RSVPs', 'Seating arrangement', 'Day-of timeline'],
      deadline: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'Critical',
    }
  ];
}

function generateChecklist(eventType, guestCount) {
  const list = ['Set budget', 'Guest list', 'Book venue', 'Hire caterer', 'Invitations'];
  if (guestCount > 50) list.push('Hire coordinator');
  return list;
}

function generateRecommendations(eventType, guestCount, budget, location) {
  return [
    `Consider a venue for ${Math.ceil(guestCount * 1.2)} guests`,
    'Allocate 10-15% for contingency',
    'Have a backup plan for weather'
  ];
}
