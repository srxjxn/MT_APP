import { z } from 'zod';

export const PAYMENT_TYPES = ['lesson', 'subscription', 'drop_in', 'other'] as const;
export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'] as const;
export const PAYMENT_PLATFORMS = ['stripe', 'square', 'cash', 'check', 'other'] as const;

export const paymentSchema = z.object({
  user_id: z.string().min(1, 'User is required'),
  amount_cents: z.number().min(1, 'Amount is required'),
  payment_type: z.enum(PAYMENT_TYPES),
  payment_status: z.enum(PAYMENT_STATUSES),
  payment_platform: z.enum(PAYMENT_PLATFORMS).optional(),
  subscription_id: z.string().optional(),
  description: z.string().optional(),
  paid_at: z.string().optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
