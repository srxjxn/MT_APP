import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { LessonTemplate, LessonInstance, LessonInstanceInsert } from '../types';

export interface GenerateResult {
  created: LessonInstance[];
  skipped: { templateName: string; date: string; reason: string }[];
}

/**
 * Pure async helper that generates lesson instances for the given templates
 * over the specified date range. Does NOT throw when all instances are skipped —
 * the caller decides how to handle that.
 */
export async function generateInstancesForTemplates(
  client: SupabaseClient<Database>,
  templates: LessonTemplate[],
  dateFrom: string,
  dateTo: string,
  orgId: string
): Promise<GenerateResult> {
  const candidates: {
    instance: Omit<LessonInstanceInsert, 'id'>;
    templateName: string;
    date: string;
    coachId: string;
    startTime: string;
    endTime: string;
  }[] = [];

  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];

    for (const template of templates) {
      if (template.day_of_week === dayOfWeek) {
        const [hours, minutes] = template.start_time.split(':').map(Number);
        const endMinutes = hours * 60 + minutes + template.duration_minutes;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

        candidates.push({
          instance: {
            org_id: orgId,
            template_id: template.id,
            coach_id: template.coach_id,
            court_id: template.court_id,
            date: dateStr,
            start_time: template.start_time,
            end_time: endTime,
            status: 'scheduled',
            name: template.name,
            lesson_type: template.lesson_type,
            duration_minutes: template.duration_minutes,
            max_students: template.max_students,
            price_cents: template.price_cents,
            description: template.description,
          },
          templateName: template.name,
          date: dateStr,
          coachId: template.coach_id,
          startTime: template.start_time,
          endTime,
        });
      }
    }
  }

  if (candidates.length === 0) {
    return { created: [], skipped: [] };
  }

  // Check for coach conflicts (both DB conflicts and intra-batch conflicts)
  const toInsert: Omit<LessonInstanceInsert, 'id'>[] = [];
  const skipped: GenerateResult['skipped'] = [];
  // Track accepted candidates to detect intra-batch conflicts
  const accepted: { coachId: string; date: string; startTime: string; endTime: string }[] = [];

  for (const candidate of candidates) {
    // Check DB conflicts
    const { data: conflicts } = await client
      .from('lesson_instances')
      .select('id')
      .eq('coach_id', candidate.coachId)
      .eq('date', candidate.date)
      .in('status', ['scheduled', 'in_progress'])
      .lt('start_time', candidate.endTime)
      .gt('end_time', candidate.startTime);

    if (conflicts && conflicts.length > 0) {
      skipped.push({
        templateName: candidate.templateName,
        date: candidate.date,
        reason: 'Coach already has a lesson at this time',
      });
      continue;
    }

    // Check intra-batch conflicts (same coach, same date, overlapping times)
    const batchConflict = accepted.some(
      (a) =>
        a.coachId === candidate.coachId &&
        a.date === candidate.date &&
        a.startTime < candidate.endTime &&
        a.endTime > candidate.startTime
    );

    if (batchConflict) {
      skipped.push({
        templateName: candidate.templateName,
        date: candidate.date,
        reason: 'Coach already has a lesson at this time',
      });
      continue;
    }

    toInsert.push(candidate.instance);
    accepted.push({
      coachId: candidate.coachId,
      date: candidate.date,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
    });
  }

  if (toInsert.length === 0) {
    return { created: [], skipped };
  }

  const { data, error } = await client
    .from('lesson_instances')
    .insert(toInsert)
    .select();

  if (error) throw error;
  return { created: data, skipped };
}
