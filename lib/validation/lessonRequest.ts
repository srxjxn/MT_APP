import { z } from 'zod';

export const LESSON_REQUEST_STATUSES = ['pending', 'approved', 'declined', 'cancelled'] as const;

export const LESSON_REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export const lessonRequestSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  coach_id: z.string().min(1, 'Coach is required'),
  preferred_date: z.string().min(1, 'Preferred date is required'),
  preferred_time: z.string().min(1, 'Preferred time is required'),
});

export type LessonRequestFormData = z.infer<typeof lessonRequestSchema>;
