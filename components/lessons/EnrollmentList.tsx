import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Checkbox, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEnrollments, useDropStudent, usePromoteFromWaitlist } from '@/lib/hooks/useEnrollments';
import { StatusBadge } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';

interface EnrollmentListProps {
  lessonInstanceId: string;
  canEdit?: boolean;
  onStudentsLoaded?: (students: { id: string; name: string }[]) => void;
  /** Emits the set of no-show student ids whenever the coach/admin toggles attendance. */
  onNoShowChange?: (noShowStudentIds: string[]) => void;
  testID?: string;
}

export function EnrollmentList({
  lessonInstanceId,
  canEdit = false,
  onStudentsLoaded,
  onNoShowChange,
  testID,
}: EnrollmentListProps) {
  const { data: enrollments } = useEnrollments(lessonInstanceId);
  const dropStudent = useDropStudent();
  const promoteFromWaitlist = usePromoteFromWaitlist();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  // Keyed by student_id. true = marked no-show (won't be charged a package hour).
  const [noShow, setNoShow] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!enrollments) return;
    const initial: Record<string, boolean> = {};
    enrollments.forEach((e) => {
      if (e.status === 'enrolled') initial[e.student_id] = e.attended === false;
    });
    setNoShow(initial);
    onNoShowChange?.(Object.keys(initial).filter((id) => initial[id]));
    if (onStudentsLoaded) {
      const students = enrollments
        .filter((e) => e.status === 'enrolled' && e.student)
        .map((e) => ({
          id: e.student_id,
          name: `${e.student?.first_name ?? ''} ${e.student?.last_name ?? ''}`.trim(),
        }));
      onStudentsLoaded(students);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments]);

  const enrolledList = enrollments?.filter((e) => e.status === 'enrolled') ?? [];
  const waitlistedList = enrollments?.filter((e) => e.status === 'waitlisted') ?? [];

  const toggleNoShow = (studentId: string) => {
    setNoShow((prev) => {
      const next = { ...prev, [studentId]: !prev[studentId] };
      onNoShowChange?.(Object.keys(next).filter((id) => next[id]));
      return next;
    });
  };

  const handleDrop = async (enrollmentId: string, wasEnrolled: boolean) => {
    try {
      await dropStudent.mutateAsync(enrollmentId);
      if (wasEnrolled) {
        const promoted = await promoteFromWaitlist.mutateAsync(lessonInstanceId);
        showSnackbar(
          promoted ? 'Student dropped. Waitlisted student promoted.' : 'Student dropped from lesson',
          'success',
        );
      } else {
        showSnackbar('Student removed from waitlist', 'success');
      }
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to drop student', 'error');
    }
  };

  if (enrolledList.length === 0 && waitlistedList.length === 0) {
    return (
      <Text variant="bodyMedium" style={styles.empty} testID={testID}>
        No students enrolled
      </Text>
    );
  }

  return (
    <View testID={testID}>
      {enrolledList.map((enrollment) => (
        <Card key={enrollment.id} style={styles.card}>
          <Card.Content style={styles.row}>
            <View style={styles.studentInfo}>
              <Text variant="bodyLarge" style={styles.studentName}>
                {enrollment.student?.first_name} {enrollment.student?.last_name}
              </Text>
              <Text variant="bodySmall" style={styles.studentDetail}>
                {enrollment.student?.skill_level === 'under_4_utr'
                  ? 'Under 4 UTR'
                  : enrollment.student?.skill_level === 'over_4_utr'
                    ? 'Over 4 UTR'
                    : enrollment.student?.skill_level}
              </Text>
              {enrollment.notes && (
                <Text variant="bodySmall" style={styles.enrollmentNotes}>
                  {enrollment.notes}
                </Text>
              )}
            </View>
            {canEdit && (
              <Pressable
                style={styles.noShowToggle}
                onPress={() => toggleNoShow(enrollment.student_id)}
                testID={`noshow-${enrollment.student_id}`}
              >
                <Checkbox
                  status={noShow[enrollment.student_id] ? 'checked' : 'unchecked'}
                  color={COLORS.warning}
                />
                <Text variant="bodySmall" style={styles.noShowLabel}>
                  No-show
                </Text>
              </Pressable>
            )}
            {canEdit && (
              <IconButton
                icon="close"
                size={20}
                onPress={() => handleDrop(enrollment.id, true)}
                testID={`drop-${enrollment.id}`}
              />
            )}
          </Card.Content>
        </Card>
      ))}

      {waitlistedList.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.waitlistHeader}>
            Waitlisted
          </Text>
          {waitlistedList.map((enrollment) => (
            <Card key={enrollment.id} style={styles.card}>
              <Card.Content style={styles.row}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color={COLORS.info}
                  style={styles.waitlistIcon}
                />
                <View style={styles.studentInfo}>
                  <Text variant="bodyLarge" style={styles.studentName}>
                    {enrollment.student?.first_name} {enrollment.student?.last_name}
                  </Text>
                  <StatusBadge status="waitlisted" />
                </View>
                {canEdit && (
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => handleDrop(enrollment.id, false)}
                    testID={`drop-waitlisted-${enrollment.id}`}
                  />
                )}
              </Card.Content>
            </Card>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: COLORS.textSecondary,
    padding: SPACING.md,
  },
  card: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  studentDetail: {
    color: COLORS.textSecondary,
  },
  enrollmentNotes: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  noShowToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noShowLabel: {
    color: COLORS.textSecondary,
  },
  waitlistHeader: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  waitlistIcon: {
    marginRight: SPACING.sm,
  },
});
