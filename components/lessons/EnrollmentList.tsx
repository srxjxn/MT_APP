import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Checkbox, Button, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useEnrollments, useMarkAttendance, useDropStudent, usePromoteFromWaitlist, EnrollmentWithStudent } from '@/lib/hooks/useEnrollments';
import { StatusBadge } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';

interface EnrollmentListProps {
  lessonInstanceId: string;
  canEdit?: boolean;
  onStudentsLoaded?: (students: { id: string; name: string }[]) => void;
  testID?: string;
}

export function EnrollmentList({ lessonInstanceId, canEdit = false, onStudentsLoaded, testID }: EnrollmentListProps) {
  const { data: enrollments } = useEnrollments(lessonInstanceId);
  const markAttendance = useMarkAttendance();
  const dropStudent = useDropStudent();
  const promoteFromWaitlist = usePromoteFromWaitlist();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (enrollments) {
      const initial: Record<string, boolean> = {};
      enrollments.forEach((e) => {
        if (e.status === 'enrolled') {
          initial[e.id] = e.attended ?? false;
        }
      });
      setAttendance(initial);
      if (onStudentsLoaded) {
        const students = enrollments
          .filter((e) => e.status === 'enrolled' && e.student)
          .map((e) => ({
            id: e.student_id,
            name: `${e.student?.first_name ?? ''} ${e.student?.last_name ?? ''}`.trim(),
          }));
        onStudentsLoaded(students);
      }
    }
  }, [enrollments]);

  const enrolledList = enrollments?.filter((e) => e.status === 'enrolled') ?? [];
  const waitlistedList = enrollments?.filter((e) => e.status === 'waitlisted') ?? [];

  const handleSaveAttendance = async () => {
    const updates = Object.entries(attendance).map(([id, attended]) => ({ id, attended }));
    try {
      await markAttendance.mutateAsync(updates);
      showSnackbar('Attendance saved', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to save attendance', 'error');
    }
  };

  const handleDrop = async (enrollmentId: string, wasEnrolled: boolean) => {
    try {
      await dropStudent.mutateAsync(enrollmentId);
      // If an enrolled student was dropped, promote from waitlist
      if (wasEnrolled) {
        const promoted = await promoteFromWaitlist.mutateAsync(lessonInstanceId);
        if (promoted) {
          showSnackbar('Student dropped. Waitlisted student promoted.', 'success');
        } else {
          showSnackbar('Student dropped from lesson', 'success');
        }
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
      {enrolledList.length > 0 && (
        <>
          {enrolledList.map((enrollment) => (
            <Card key={enrollment.id} style={styles.card}>
              <Card.Content style={styles.row}>
                {canEdit && (
                  <Checkbox
                    status={attendance[enrollment.id] ? 'checked' : 'unchecked'}
                    onPress={() =>
                      setAttendance((prev) => ({
                        ...prev,
                        [enrollment.id]: !prev[enrollment.id],
                      }))
                    }
                    color={COLORS.primary}
                    testID={`attendance-${enrollment.id}`}
                  />
                )}
                <View style={styles.studentInfo}>
                  <Text variant="bodyLarge" style={styles.studentName}>
                    {enrollment.student?.first_name} {enrollment.student?.last_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.studentDetail}>
                    {enrollment.student?.skill_level}
                  </Text>
                  {enrollment.notes && (
                    <Text variant="bodySmall" style={styles.enrollmentNotes}>
                      {enrollment.notes}
                    </Text>
                  )}
                </View>
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
          {canEdit && (
            <Button
              mode="contained"
              onPress={handleSaveAttendance}
              loading={markAttendance.isPending}
              style={styles.saveButton}
              testID="save-attendance"
            >
              Save Attendance
            </Button>
          )}
        </>
      )}

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
  saveButton: {
    marginTop: SPACING.md,
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
