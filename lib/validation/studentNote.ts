import { z } from 'zod';

export const studentNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  is_private: z.boolean(),
  student_id: z.string().min(1),
  lesson_instance_id: z.string().optional(),
});

export type StudentNoteFormData = z.infer<typeof studentNoteSchema>;
