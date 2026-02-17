import { z } from 'zod';

export const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled', 'expired'] as const;

export const subscriptionSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  price_cents: z.number().min(0),
  lessons_per_month: z.number().min(1).optional(),
  user_id: z.string().min(1, 'User is required'),
  starts_at: z.string().min(1, 'Start date is required'),
  ends_at: z.string().optional(),
  status: z.enum(SUBSCRIPTION_STATUSES),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;
