import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Portal, Modal, Button, FAB } from 'react-native-paper';
import { useAuthStore } from '@/lib/stores/authStore';
import { useCoachLessonInstancesWithVirtuals, useCreateLessonInstance, LessonInstanceWithJoins } from '@/lib/hooks/useLessonInstances';
import { useCreateStudentNote } from '@/lib/hooks/useStudentNotes';
import { useCourts } from '@/lib/hooks/useCourts';
import { useStudents } from '@/lib/hooks/useStudents';
import { useEnrollStudent } from '@/lib/hooks/useEnrollments';
import { LessonCard } from '@/components/lessons/LessonCard';
import { EnrollmentList } from '@/components/lessons/EnrollmentList';
import { NoteForm } from '@/components/students/NoteForm';
import { LessonTypeToggle } from '@/components/lessons/LessonTypeToggle';
import { CoachPrivateLessonForm, CoachPrivateLessonFormData } from '@/components/coach/CoachPrivateLessonForm';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { StudentNoteFormData } from '@/lib/validation/studentNote';
import { formatTime } from '@/lib/utils/formatTime';

export default function CoachSchedule() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const [lessonTypeFilter, setLessonTypeFilter] = useState('all');
  const filterValue = lessonTypeFilter === 'all' ? undefined : lessonTypeFilter;
  const { data: instances, isLoading, refetch, isRefetching } = useCoachLessonInstancesWithVirtuals(filterValue);
  const createNote = useCreateStudentNote();
  const createInstance = useCreateLessonInstance();
  const { data: courts } = useCourts();
  const { data: students } = useStudents();
  const enrollStudent = useEnrollStudent();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedVirtual, setSelectedVirtual] = useState<LessonInstanceWithJoins | null>(null);
  const selectedInstance = instances?.find((i) => i.id === selectedId);

  if (isLoading) {
    return <LoadingScreen message="Loading schedule..." testID="coach-schedule-loading" />;
  }

  const handleOpenNoteForm = () => {
    setShowNoteForm(true);
  };

  const handleAddNote = async (data: StudentNoteFormData) => {
    try {
      await createNote.mutateAsync(data);
      showSnackbar('Note added', 'success');
      setShowNoteForm(false);
      setSelectedStudentId(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to add note', 'error');
    }
  };

  const handleCreateLesson = async (data: CoachPrivateLessonFormData) => {
    try {
      const [hours, minutes] = data.start_time.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + data.duration_minutes;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

      const instance = await createInstance.mutateAsync({
        template_id: null,
        coach_id: userProfile!.id,
        court_id: data.court_id || null,
        date: data.date,
        start_time: data.start_time,
        end_time: endTime,
        name: data.name,
        lesson_type: data.lesson_type as any,
        duration_minutes: data.duration_minutes,
        max_students: data.max_students,
        price_cents: data.price_cents,
        description: data.description,
        status: 'scheduled',
      });

      if (data.student_id && instance?.id) {
        await enrollStudent.mutateAsync({
          lessonInstanceId: instance.id,
          studentId: data.student_id,
        });
      }

      showSnackbar('Lesson created', 'success');
      setShowCreateForm(false);
      refetch();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create lesson', 'error');
    }
  };

  return (
    <View style={styles.container} testID="coach-schedule">
      <Text variant="headlineSmall" style={styles.welcome}>
        Welcome, Coach {userProfile?.first_name ?? ''}!
      </Text>
      <LessonTypeToggle
        value={lessonTypeFilter}
        onValueChange={setLessonTypeFilter}
        style={styles.toggle}
      />
      <FlatList
        data={instances}
        renderItem={({ item }: { item: LessonInstanceWithJoins }) => (
          <LessonCard
            instance={item}
            onPress={() => item._isVirtual ? setSelectedVirtual(item) : setSelectedId(item.id)}
            testID={`coach-instance-${item.id}`}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={instances?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-blank"
            title="No Lessons"
            description="You don't have any scheduled lessons"
          />
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowCreateForm(true)}
        testID="coach-create-lesson-fab"
      />

      <Portal>
        <Modal
          visible={showCreateForm}
          onDismiss={() => setShowCreateForm(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Create Private Lesson</Text>
          <CoachPrivateLessonForm
            courts={courts}
            students={students}
            onSubmit={handleCreateLesson}
            loading={createInstance.isPending || enrollStudent.isPending}
            testID="coach-create-lesson-form"
          />
        </Modal>

        <Modal
          visible={!!selectedId}
          onDismiss={() => { setSelectedId(null); setShowNoteForm(false); setSelectedStudentId(null); }}
          contentContainerStyle={styles.modal}
        >
          {selectedInstance && (
            <ScrollView>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {selectedInstance.name}
              </Text>
              <Text variant="bodyMedium" style={styles.modalInfo}>
                {selectedInstance.date} • {formatTime(selectedInstance.start_time)} - {formatTime(selectedInstance.end_time)}
              </Text>
              <Text variant="titleMedium" style={styles.enrollmentTitle}>
                Students & Attendance
              </Text>
              <EnrollmentList
                lessonInstanceId={selectedInstance.id}
                canEdit
                onStudentsLoaded={setEnrolledStudents}
                testID="coach-enrollment-list"
              />

              <View style={styles.noteSection}>
                <Text variant="titleMedium" style={styles.enrollmentTitle}>Add Note</Text>
                {!showNoteForm ? (
                  <Button
                    mode="outlined"
                    icon="note-plus"
                    onPress={handleOpenNoteForm}
                    testID="coach-add-note-button"
                  >
                    Add Note for Student
                  </Button>
                ) : (
                  <View>
                    <Text variant="bodyMedium" style={styles.pickStudentLabel}>Select Student</Text>
                    <View style={styles.studentPickerList}>
                      <ScrollView nestedScrollEnabled>
                        {enrolledStudents.map((student) => (
                          <TouchableOpacity key={student.id} onPress={() => setSelectedStudentId(student.id)}>
                            <View style={[styles.studentPickerRow, selectedStudentId === student.id && styles.studentPickerRowSelected]}>
                              <Text variant="bodyLarge" style={styles.studentPickerRowText}>{student.name}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    {selectedStudentId && (
                      <NoteForm
                        studentId={selectedStudentId}
                        lessonInstanceId={selectedInstance.id}
                        onSubmit={handleAddNote}
                        loading={createNote.isPending}
                        testID="coach-note-form"
                      />
                    )}
                  </View>
                )}
              </View>

              <Button mode="outlined" onPress={() => { setSelectedId(null); setShowNoteForm(false); setSelectedStudentId(null); }} style={styles.closeButton}>
                Close
              </Button>
            </ScrollView>
          )}
        </Modal>
        <Modal
          visible={!!selectedVirtual}
          onDismiss={() => setSelectedVirtual(null)}
          contentContainerStyle={styles.modal}
        >
          {selectedVirtual && (
            <View>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {selectedVirtual.name}
              </Text>
              <Text variant="bodyMedium" style={styles.modalInfo}>
                {selectedVirtual.date} • {formatTime(selectedVirtual.start_time)} - {formatTime(selectedVirtual.end_time)}
              </Text>
              {selectedVirtual.court && (
                <Text variant="bodyMedium" style={styles.modalInfo}>
                  Court: {selectedVirtual.court.name}
                </Text>
              )}
              <Text variant="bodySmall" style={styles.virtualNote}>
                This lesson has not been generated yet. It will be created automatically when students enroll.
              </Text>
              <Button mode="outlined" onPress={() => setSelectedVirtual(null)} style={styles.closeButton}>
                Close
              </Button>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  welcome: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    padding: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  toggle: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  list: {
    padding: SPACING.md,
    paddingTop: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
  },
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    padding: SPACING.md,
    maxHeight: '80%',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  modalInfo: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  enrollmentTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  noteSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  pickStudentLabel: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  studentPickerList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  studentPickerRow: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  studentPickerRowSelected: {
    backgroundColor: COLORS.primaryLight + '22',
  },
  studentPickerRowText: {
    color: COLORS.textPrimary,
  },
  closeButton: {
    marginTop: SPACING.md,
  },
  virtualNote: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});
