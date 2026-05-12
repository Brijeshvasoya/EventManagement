import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const budgetPlanningTool = createTool({
  id: 'budget-planning',
  description: 'Plan and manage event budgets with detailed breakdowns',
  inputSchema: z.object({
    totalBudget: z.number().describe('Total event budget'),
    eventType: z.string().describe('Type of event'),
    guestCount: z.number().describe('Number of guests'),
  }),
  execute: async ({ input }) => {
    const { totalBudget, eventType, guestCount } = input;
    const allocations = {
      wedding: { venue: 0.35, catering: 0.30, beverages: 0.10, decoration: 0.10, entertainment: 0.08, photography: 0.05, staff: 0.02 },
      corporate: { venue: 0.25, catering: 0.35, beverages: 0.15, staff: 0.10, miscellaneous: 0.15 },
      birthday: { venue: 0.30, catering: 0.40, decoration: 0.15, entertainment: 0.10, miscellaneous: 0.05 },
    };

    const eventAllocation = allocations[eventType] || allocations.corporate;
    const contingency = Math.round(totalBudget * 0.10);
    const breakdown = { contingency };

    Object.entries(eventAllocation).forEach(([key, percentage]) => {
      breakdown[key] = Math.round(totalBudget * percentage);
    });

    return {
      budgetBreakdown: breakdown,
      recommendations: [
        'Allocate 10-15% for contingency',
        'Get quotes from 3 vendors per category',
        'Consider off-peak days for better rates'
      ],
      costSavingTips: [
        'Book in advance',
        'Digital invitations',
        'In-season flowers'
      ]
    };
  },
});
