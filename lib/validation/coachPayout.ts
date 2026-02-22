import { z } from 'zod';

export const coachPayoutSchema = z.object({
  coach_id: z.string().min(1, 'Coach is required'),
  period_start: z.string().min(1, 'Start date is required'),
  period_end: z.string().min(1, 'End date is required'),
});

export type CoachPayoutFormData = z.infer<typeof coachPayoutSchema>;
