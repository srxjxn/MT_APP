import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Chip, Menu, Portal, Dialog, Modal, ProgressBar } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useLessonInstance, useUpdateLessonInstance, useDeleteLessonInstance, useAdditionalCoaches, useAddAdditionalCoach, useRemoveAdditionalCoach } from '@/lib/hooks/useLessonInstances';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { useStudents } from '@/lib/hooks/useStudents';
import { useEnrollStudent, useBulkEnrollByUTR } from '@/lib/hooks/useEnrollments';
import { useCreateNotification } from '@/lib/hooks/useNotifications';
import { EnrollmentList } from '@/components/lessons/EnrollmentList';
import { CoachPrivateLessonForm, CoachPrivateLessonFormData } from '@/components/coach/CoachPrivateLessonForm';
import { useCourts } from '@/lib/hooks/useCourts';
import { LoadingScreen, StatusBadge, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { LESSON_TYPE_LABELS } from '@/lib/validation/lessonTemplate';
import { formatTime } from '@/lib/utils/formatTime';
import { SkillLevel } from '@/lib/types';

const STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'] as const;

export default function InstanceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: instance, isLoading } = useLessonInstance(id!);
  const { data: allStudents } = useStudents();
  const { data: courts } = useCourts();
  const updateInstance = useUpdateLessonInstance();
  const deleteInstance = useDeleteLessonInstance();
  const enrollStudent = useEnrollStudent();
  const bulkEnroll = useBulkEnrollByUTR();
  const createNotification = useCreateNotification();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddCoach, setShowAddCoach] = useState(false);
  const { data: additionalCoaches } = useAdditionalCoaches(id);
  const addCoach = useAddAdditionalCoach();
  const removeCoach = useRemoveAdditionalCoach();
  const { data: allCoaches } = useCoachUsers();

  if (isLoading || !instance) {
    return <LoadingScreen message="Loading lesson..." />;
  }

  const enrolledCount = instance.enrollments_list?.filter((e: any) => e.status === 'enrolled').length ?? 0;
  const maxStudents = instance.max_students;
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
        const lessonName = instance.name;
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

  const canEditInstance = instance.status === 'scheduled' &&
    (instance.lesson_type === 'private' || instance.lesson_type === 'semi_private');

  const handleEditLesson = async (data: CoachPrivateLessonFormData) => {
    try {
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + data.duration_minutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      await updateInstance.mutateAsync({
        id: instance.id,
        date: data.date,
        start_time: data.start_time,
        end_time: endTime,
        name: data.name,
        duration_minutes: data.duration_minutes,
        max_students: data.max_students,
        court_id: data.court_id || null,
        description: data.description,
      });

      showSnackbar('Lesson updated', 'success');
      setShowEditForm(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update lesson', 'error');
    }
  };

  const handleAddStudent = async (studentId: string) => {
    try {
      const result = await enrollStudent.mutateAsync({ lessonInstanceId: instance.id, studentId });
      if (result.action === 'enrolled') {
        showSnackbar('Student enrolled', 'success');
        setShowAddStudent(false);
      } else if (result.action === 'revived') {
        showSnackbar('Student added back to the roster', 'success');
        setShowAddStudent(false);
      } else {
        showSnackbar('Student is already on the roster', 'info');
      }
    } catch {
      showSnackbar('Failed to add student', 'error');
    }
  };

  const handleBulkEnroll = async (skillLevel: SkillLevel) => {
    try {
      const result = await bulkEnroll.mutateAsync({
        lessonInstanceId: instance.id,
        skillLevel,
      });
      const label = skillLevel === 'under_4_utr' ? 'Under 4 UTR' : 'Over 4 UTR';
      if (
        result.enrolledCount === 0 &&
        result.revivedCount === 0 &&
        result.waitlistedCount === 0 &&
        result.skippedCount === 0
      ) {
        showSnackbar('No new students to enroll', 'info');
      } else {
        const parts: string[] = [];
        if (result.enrolledCount > 0) parts.push(`${result.enrolledCount} enrolled`);
        if (result.revivedCount > 0) parts.push(`${result.revivedCount} re-added`);
        if (result.waitlistedCount > 0) parts.push(`${result.waitlistedCount} waitlisted`);
        if (result.skippedCount > 0) parts.push(`${result.skippedCount} already enrolled`);
        showSnackbar(`${label}: ${parts.join(', ')}`, 'success');
      }
      setShowAddStudent(false);
    } catch {
      showSnackbar('Failed to add students', 'error');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              {instance.name}
            </Text>
            <StatusBadge status={instance.status} />
          </View>

          {instance.description && (
            <Text variant="bodyMedium" style={styles.description}>
              {instance.description}
            </Text>
          )}

          <Text variant="bodyLarge" style={styles.info}>
            {instance.date} • {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
          </Text>
          <Text variant="bodyMedium" style={styles.info}>
            Coach: {instance.coach?.first_name} {instance.coach?.last_name}
          </Text>
          {additionalCoaches && additionalCoaches.length > 0 && (
            <View style={styles.additionalCoachesRow}>
              <Text variant="bodySmall" style={styles.additionalCoachesLabel}>Additional Coaches:</Text>
              <View style={styles.chipRow}>
                {additionalCoaches.map((ac) => (
                  <Chip
                    key={ac.id}
                    compact
                    onClose={instance.status === 'scheduled' ? () => removeCoach.mutate({ id: ac.id, instanceId: instance.id }) : undefined}
                    style={styles.coachChip}
                    testID={`additional-coach-${ac.coach_id}`}
                  >
                    {ac.coach.first_name} {ac.coach.last_name}
                  </Chip>
                ))}
              </View>
            </View>
          )}
          {instance.status === 'scheduled' && (
            <Button
              mode="text"
              icon="account-plus"
              onPress={() => setShowAddCoach(true)}
              compact
              testID="add-coach-button"
            >
              Add Coach
            </Button>
          )}
          {instance.court && (
            <Text variant="bodyMedium" style={styles.info}>Court: {instance.court.name}</Text>
          )}
          {instance.lesson_type && (
            <Chip compact style={styles.typeBadge}>
              {LESSON_TYPE_LABELS[instance.lesson_type]}
            </Chip>
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
              {canEditInstance && (
                <Button
                  mode="outlined"
                  icon="pencil"
                  onPress={() => setShowEditForm(true)}
                  contentStyle={styles.statusContent}
                  testID="edit-lesson-button"
                >
                  Edit Lesson
                </Button>
              )}
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
              {!instance.template_id && (
                <Button
                  mode="outlined"
                  icon="delete"
                  onPress={() => setShowDeleteDialog(true)}
                  textColor={COLORS.error}
                  style={styles.cancelButton}
                  contentStyle={styles.statusContent}
                  testID="delete-lesson-button"
                >
                  Delete Lesson
                </Button>
              )}
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
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Lesson"
        message="Are you sure you want to permanently delete this lesson? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await deleteInstance.mutateAsync(instance.id);
            showSnackbar('Lesson deleted', 'success');
            setShowDeleteDialog(false);
            router.back();
          } catch (err: any) {
            showSnackbar(err.message ?? 'Failed to delete lesson', 'error');
            setShowDeleteDialog(false);
          }
        }}
        onCancel={() => setShowDeleteDialog(false)}
        testID="delete-lesson-dialog"
      />

      <Portal>
        <Modal
          visible={showEditForm}
          onDismiss={() => setShowEditForm(false)}
          contentContainerStyle={styles.editModal}
        >
          <Text variant="titleLarge" style={styles.editModalTitle}>Edit Lesson</Text>
          <CoachPrivateLessonForm
            courts={courts}
            onSubmit={handleEditLesson}
            loading={updateInstance.isPending}
            submitLabel="Save Changes"
            initialValues={{
              name: instance.name,
              lesson_type: instance.lesson_type as 'private' | 'semi_private',
              date: instance.date,
              start_time: instance.start_time,
              duration_minutes: instance.duration_minutes,
              max_students: instance.max_students ?? undefined,
              court_id: instance.court_id ?? undefined,
              description: instance.description ?? undefined,
            }}
            testID="admin-edit-lesson-form"
          />
        </Modal>
        <Dialog visible={showAddStudent} onDismiss={() => setShowAddStudent(false)}>
          <Dialog.Title>Add Student</Dialog.Title>
          <Dialog.Content>
            <View style={styles.bulkEnrollRow}>
              {instance?.skill_level ? (
                <Button
                  mode="contained-tonal"
                  onPress={() => handleBulkEnroll(instance.skill_level!)}
                  loading={bulkEnroll.isPending}
                  style={styles.bulkEnrollButton}
                  compact
                  testID="bulk-enroll-matching"
                >
                  {instance.skill_level === 'under_4_utr'
                    ? 'Enroll all Under 4 UTR'
                    : 'Enroll all Over 4 UTR'}
                </Button>
              ) : (
                <>
                  <Button
                    mode="contained-tonal"
                    onPress={() => handleBulkEnroll('under_4_utr')}
                    loading={bulkEnroll.isPending}
                    style={styles.bulkEnrollButton}
                    compact
                    testID="bulk-enroll-under-4"
                  >
                    Under 4 UTR
                  </Button>
                  <Button
                    mode="contained-tonal"
                    onPress={() => handleBulkEnroll('over_4_utr')}
                    loading={bulkEnroll.isPending}
                    style={styles.bulkEnrollButton}
                    compact
                    testID="bulk-enroll-over-4"
                  >
                    Over 4 UTR
                  </Button>
                </>
              )}
            </View>
            <Text variant="labelMedium" style={styles.orLabel}>Or add individually</Text>
          </Dialog.Content>
          <Dialog.ScrollArea style={{ maxHeight: 300 }}>
            <ScrollView>
              {allStudents
                ?.filter((student) =>
                  instance?.skill_level ? student.skill_level === instance.skill_level : true
                )
                .map((student) => (
                <TouchableOpacity key={student.id} onPress={() => handleAddStudent(student.id)}>
                  <View style={styles.studentRow}>
                    <Text variant="bodyLarge" style={styles.studentRowText}>
                      {student.first_name} {student.last_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowAddStudent(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={showAddCoach} onDismiss={() => setShowAddCoach(false)}>
          <Dialog.Title>Add Coach</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 350 }}>
            <ScrollView>
              {allCoaches
                ?.filter((c) => c.id !== instance?.coach_id && !additionalCoaches?.some((ac) => ac.coach_id === c.id))
                .map((coach) => (
                  <TouchableOpacity
                    key={coach.id}
                    onPress={async () => {
                      try {
                        await addCoach.mutateAsync({ instanceId: instance!.id, coachId: coach.id });
                        showSnackbar('Coach added', 'success');
                        setShowAddCoach(false);
                      } catch (err: any) {
                        showSnackbar(err.message ?? 'Failed to add coach', 'error');
                      }
                    }}
                  >
                    <View style={styles.studentRow}>
                      <Text variant="bodyLarge" style={styles.studentRowText}>
                        {coach.first_name} {coach.last_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowAddCoach(false)}>Cancel</Button>
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
  studentRow: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  studentRowText: {
    color: COLORS.textPrimary,
  },
  editModal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    padding: SPACING.md,
    maxHeight: '80%',
  },
  editModalTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  additionalCoachesRow: {
    marginBottom: SPACING.xs,
  },
  additionalCoachesLabel: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  coachChip: {
    marginBottom: SPACING.xs,
  },
  bulkEnrollRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bulkEnrollButton: {
    flex: 1,
  },
  orLabel: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
