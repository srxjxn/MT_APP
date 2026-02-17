import { z } from 'zod';

export const SURFACE_TYPES = [
  'Hard',
  'Clay',
  'Grass',
  'Carpet',
  'Artificial Turf',
] as const;

export const COURT_STATUSES = ['active', 'maintenance', 'inactive'] as const;

export const courtSchema = z.object({
  name: z.string().min(1, 'Court name is required'),
  surface_type: z.string().min(1, 'Surface type is required'),
  is_indoor: z.boolean(),
  status: z.enum(COURT_STATUSES),
  notes: z.string().optional(),
});

export type CourtFormData = z.infer<typeof courtSchema>;
