import { z } from 'zod';

export const availabilitySchema = z.object({
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  is_recurring: z.boolean(),
  specific_date: z.string().optional(),
});

export type AvailabilityFormData = z.infer<typeof availabilitySchema>;
