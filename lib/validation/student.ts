import { z } from 'zod';

export const SKILL_LEVELS = ['under_4_utr', 'over_4_utr'] as const;

export const studentSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().optional(),
  skill_level: z.enum(SKILL_LEVELS),
  medical_notes: z.string().optional(),
  parent_id: z.string().min(1, 'Parent is required'),
});

export type StudentFormData = z.infer<typeof studentSchema>;
