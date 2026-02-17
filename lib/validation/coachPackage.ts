import { z } from 'zod';

export const coachPackageSchema = z.object({
  coach_id: z.string().min(1, 'Coach is required'),
  name: z.string().min(1, 'Package name is required'),
  num_hours: z.number().min(1, 'Must be at least 1 hour'),
  price_cents: z.number().min(0, 'Price cannot be negative'),
});

export type CoachPackageFormData = z.infer<typeof coachPackageSchema>;
