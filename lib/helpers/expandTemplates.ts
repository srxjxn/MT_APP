import { LessonInstanceWithJoins } from '../hooks/useLessonInstances';
import { LessonTemplateWithJoins } from '../hooks/useLessonTemplates';

/**
 * Expand active templates into virtual LessonInstanceWithJoins objects
 * for a given date range. Only generates for dates >= today.
 */
export function expandTemplatesToVirtuals(
  templates: LessonTemplateWithJoins[],
  dateFrom: string,
  dateTo: string,
  orgId: string
): LessonInstanceWithJoins[] {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const virtuals: LessonInstanceWithJoins[] = [];
  const from = new Date(dateFrom + 'T00:00:00Z');
  const to = new Date(dateTo + 'T00:00:00Z');

  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];

    // Skip past dates
    if (dateStr < todayStr) continue;

    const dayOfWeek = d.getUTCDay();

    for (const template of templates) {
      if (!template.is_active) continue;
      if (template.day_of_week !== dayOfWeek) continue;

      const [hours, minutes] = template.start_time.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + template.duration_minutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      virtuals.push({
        id: `virtual_${template.id}_${dateStr}`,
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
        skill_level: template.skill_level,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        template: {
          name: template.name,
          lesson_type: template.lesson_type,
          max_students: template.max_students,
          price_cents: template.price_cents,
          description: template.description,
        },
        coach: template.coach,
        court: template.court,
        enrollment_count: 0,
        _isVirtual: true,
        _templateId: template.id,
      });
    }
  }

  return virtuals;
}

/**
 * Merge real instances with virtual ones, deduplicating by template_id + date.
 * Real instances always win over virtuals.
 */
export function mergeVirtualAndReal(
  realInstances: LessonInstanceWithJoins[],
  virtualInstances: LessonInstanceWithJoins[]
): LessonInstanceWithJoins[] {
  // Build set of keys from real instances that have a template_id
  const realKeys = new Set<string>();
  for (const inst of realInstances) {
    if (inst.template_id) {
      realKeys.add(`${inst.template_id}_${inst.date}`);
    }
  }

  // Filter out virtuals that already have a real counterpart
  const survivingVirtuals = virtualInstances.filter(
    (v) => !realKeys.has(`${v._templateId}_${v.date}`)
  );

  // Concatenate and sort
  const merged = [...realInstances, ...survivingVirtuals];
  merged.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return a.start_time < b.start_time ? -1 : a.start_time > b.start_time ? 1 : 0;
  });

  return merged;
}
