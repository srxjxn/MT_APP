import { z } from 'zod';

export const LESSON_TYPES = ['group', 'private', 'semi_private', 'camp'] as const;

export const LESSON_TYPE_LABELS: Record<string, string> = {
  group: 'Group',
  private: 'Private',
  semi_private: 'Semi-Private',
  camp: 'Camp',
};

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

export const lessonTemplateSchema = z.object({
  name: z.string().min(1, 'Lesson name is required'),
  lesson_type: z.enum(LESSON_TYPES),
  coach_id: z.string().min(1, 'Coach is required'),
  court_id: z.string().optional(),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, 'Start time is required'),
  duration_minutes: z.number().min(15, 'Duration must be at least 15 minutes').max(480),
  max_students: z.number().min(1, 'Must allow at least 1 student').max(50),
  price_cents: z.number().min(0, 'Price cannot be negative'),
  description: z.string().optional(),
});

export type LessonTemplateFormData = z.infer<typeof lessonTemplateSchema>;
