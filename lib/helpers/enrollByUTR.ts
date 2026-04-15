import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

/**
 * Auto-enroll students matching a skill_level onto the given lesson instances.
 * Students already enrolled or waitlisted on an instance are skipped.
 * Enrollments fill up to `max_students` per instance, remainder waitlisted.
 */
export async function enrollStudentsByUTR(
  client: SupabaseClient<Database>,
  instanceIds: string[],
  skillLevel: string,
  orgId: string
): Promise<void> {
  if (instanceIds.length === 0) return;

  const { data: students, error: studentsError } = await client
    .from('students')
    .select('id')
    .eq('org_id', orgId)
    .eq('skill_level', skillLevel as any);
  if (studentsError) throw studentsError;
  const studentIds = (students ?? []).map((s) => s.id);
  if (studentIds.length === 0) return;

  const { data: instances, error: instError } = await client
    .from('lesson_instances')
    .select('id, max_students')
    .in('id', instanceIds);
  if (instError) throw instError;

  const { data: existing, error: existError } = await client
    .from('enrollments')
    .select('lesson_instance_id, student_id, status')
    .in('lesson_instance_id', instanceIds)
    .in('status', ['enrolled', 'waitlisted']);
  if (existError) throw existError;

  const existingMap = new Map<string, Set<string>>();
  const enrolledCountMap = new Map<string, number>();
  for (const row of existing ?? []) {
    const set = existingMap.get(row.lesson_instance_id) ?? new Set<string>();
    set.add(row.student_id);
    existingMap.set(row.lesson_instance_id, set);
    if (row.status === 'enrolled') {
      enrolledCountMap.set(row.lesson_instance_id, (enrolledCountMap.get(row.lesson_instance_id) ?? 0) + 1);
    }
  }

  const inserts: {
    org_id: string;
    lesson_instance_id: string;
    student_id: string;
    status: 'enrolled' | 'waitlisted';
  }[] = [];

  for (const inst of instances ?? []) {
    const already = existingMap.get(inst.id) ?? new Set<string>();
    let enrolledCount = enrolledCountMap.get(inst.id) ?? 0;
    const max = inst.max_students;
    for (const sid of studentIds) {
      if (already.has(sid)) continue;
      const canEnroll = max == null || enrolledCount < max;
      inserts.push({
        org_id: orgId,
        lesson_instance_id: inst.id,
        student_id: sid,
        status: canEnroll ? 'enrolled' : 'waitlisted',
      });
      if (canEnroll) enrolledCount += 1;
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await client.from('enrollments').insert(inserts);
    if (insertError) throw insertError;
  }
}
