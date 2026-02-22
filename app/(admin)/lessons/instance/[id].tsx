import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Text, Button, Chip, Menu, Portal, Dialog, ProgressBar } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useLessonInstance, useUpdateLessonInstance } from '@/lib/hooks/useLessonInstances';
import { useStudents } from '@/lib/hooks/useStudents';
import { useEnrollStudent } from '@/lib/hooks/useEnrollments';
import { useCreateNotification } from '@/lib/hooks/useNotifications';
import { EnrollmentList } from '@/components/lessons/EnrollmentList';
import { LoadingScreen, StatusBadge, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { LESSON_TYPE_LABELS } from '@/lib/validation/lessonTemplate';

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

export default function InstanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: instance, isLoading } = useLessonInstance(id!);
  const { data: allStudents } = useStudents();
  const updateInstance = useUpdateLessonInstance();
  const enrollStudent = useEnrollStudent();
  const createNotification = useCreateNotification();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentMenuVisible, setStudentMenuVisible] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  if (isLoading || !instance) {
    return <LoadingScreen message="Loading lesson..." />;
  }

  const enrolledCount = instance.enrollments_list?.filter((e: any) => e.status === 'enrolled').length ?? 0;
  const maxStudents = instance.template?.max_students;
  const capacityRatio = maxStudents ? enrolledCount / maxStudents : 0;
  const capacityColor = capacityRatio >= 1 ? COLORS.error : capacityRatio >= 0.8 ? COLORS.warning : COLORS.success;

  const handleStatusChange = async (status: string) => {
    try {
      await updateInstance.mutateAsync({ id: instance.id, status: status as any });

      if (status === 'cancelled' && instance.enrollments_list) {
        const enrolledStudents = instance.enrollments_list.filter(
          (e: any) => e.status === 'enrolled' || e.status === 'waitlisted'
        );
        const parentIds = [...new Set(enrolledStudents.map((e: any) => e.student?.parent_id).filter(Boolean))];
        const lessonName = instance.template?.name ?? 'Lesson';
        const lessonDate = instance.date;
        const lessonTime = instance.start_time;

        let notifiedCount = 0;
        for (const parentId of parentIds) {
          try {
            await createNotification.mutateAsync({
              user_id: parentId,
              title: 'Lesson Cancelled',
              body: `The lesson ${lessonName} on ${lessonDate} at ${lessonTime} has been cancelled.`,
            });
            notifiedCount++;
          } catch {}
        }
        showSnackbar(`Lesson cancelled. ${notifiedCount} parent${notifiedCount !== 1 ? 's' : ''} notified.`, 'success');
      } else {
        showSnackbar(`Lesson marked as ${status}`, 'success');
      }
      setStatusMenuVisible(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update status', 'error');
    }
  };

  const handleAddStudent = async (studentId: string) => {
    try {
      await enrollStudent.mutateAsync({ lessonInstanceId: instance.id, studentId });
      showSnackbar('Student enrolled', 'success');
      setStudentMenuVisible(false);
      setShowAddStudent(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to enroll student', 'error');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              {instance.template?.name ?? 'Ad-hoc Lesson'}
            </Text>
            <StatusBadge status={instance.status} />
          </View>

          {instance.template?.description && (
            <Text variant="bodyMedium" style={styles.description}>
              {instance.template.description}
            </Text>
          )}

          <Text variant="bodyLarge" style={styles.info}>
            {instance.date} • {instance.start_time} - {instance.end_time}
          </Text>
          <Text variant="bodyMedium" style={styles.info}>
            Coach: {instance.coach?.first_name} {instance.coach?.last_name}
          </Text>
          {instance.court && (
            <Text variant="bodyMedium" style={styles.info}>Court: {instance.court.name}</Text>
          )}
          {instance.template?.lesson_type && (
            <Chip compact style={styles.typeBadge}>
              {LESSON_TYPE_LABELS[instance.template.lesson_type]}
            </Chip>
          )}
          {instance.template?.price_cents != null && (
            <Text variant="bodyMedium" style={styles.info}>
              Price: ${(instance.template.price_cents / 100).toFixed(2)}
            </Text>
          )}

          <View style={styles.capacitySection}>
            <Text variant="bodyMedium" style={[styles.capacityText, { color: capacityColor }]}>
              Enrolled: {enrolledCount}{maxStudents ? `/${maxStudents}` : ''}
            </Text>
            {maxStudents != null && (
              <ProgressBar
                progress={capacityRatio}
                color={capacityColor}
                style={styles.capacityBar}
              />
            )}
          </View>

          {instance.notes && (
            <Text variant="bodyMedium" style={styles.notes}>Notes: {instance.notes}</Text>
          )}

          {instance.status === 'scheduled' && (
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={() => handleStatusChange('completed')}
                loading={updateInstance.isPending}
                style={styles.confirmButton}
                contentStyle={styles.statusContent}
                testID="confirm-class-button"
              >
                Confirm Class
              </Button>
              <Button
                mode="outlined"
                onPress={() => setShowCancelDialog(true)}
                textColor={COLORS.error}
                style={styles.cancelButton}
                contentStyle={styles.statusContent}
                testID="cancel-class-button"
              >
                Cancel Class
              </Button>
            </View>
          )}

          <Menu
            visible={statusMenuVisible}
            onDismiss={() => setStatusMenuVisible(false)}
            anchor={
              <Button
                mode="text"
                onPress={() => setStatusMenuVisible(true)}
                style={styles.statusButton}
                compact
                testID="change-status-button"
              >
                More Status Options
              </Button>
            }
          >
            {STATUSES.map((s) => (
              <Menu.Item
                key={s}
                onPress={() => handleStatusChange(s)}
                title={s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
              />
            ))}
          </Menu>
        </Card.Content>
      </Card>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Enrolled Students
        </Text>
        <Button
          mode="contained-tonal"
          onPress={() => setShowAddStudent(true)}
          compact
          testID="add-student-button"
        >
          Add Student
        </Button>
      </View>

      <View style={styles.enrollmentSection}>
        <EnrollmentList
          lessonInstanceId={instance.id}
          canEdit
          testID="instance-enrollment-list"
        />
      </View>

      <ConfirmDialog
        visible={showCancelDialog}
        title="Cancel Class"
        message="Are you sure you want to cancel this class? Parents of enrolled students will be notified."
        confirmLabel="Cancel Class"
        destructive
        onConfirm={() => {
          setShowCancelDialog(false);
          handleStatusChange('cancelled');
        }}
        onCancel={() => setShowCancelDialog(false)}
        testID="cancel-class-dialog"
      />

      <Portal>
        <Dialog visible={showAddStudent} onDismiss={() => setShowAddStudent(false)}>
          <Dialog.Title>Add Student</Dialog.Title>
          <Dialog.Content>
            <Menu
              visible={studentMenuVisible}
              onDismiss={() => setStudentMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setStudentMenuVisible(true)}>
                  Select Student
                </Button>
              }
            >
              {allStudents?.map((student) => (
                <Menu.Item
                  key={student.id}
                  onPress={() => handleAddStudent(student.id)}
                  title={`${student.first_name} ${student.last_name}`}
                />
              ))}
            </Menu>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddStudent(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  infoCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  description: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  info: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  capacitySection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  capacityText: {
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  capacityBar: {
    height: 6,
    borderRadius: 3,
  },
  notes: {
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  actionButtons: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
  },
  cancelButton: {
    borderColor: COLORS.error,
  },
  statusButton: {
    marginTop: SPACING.xs,
  },
  statusContent: {
    height: LAYOUT.buttonHeight,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  enrollmentSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
});
