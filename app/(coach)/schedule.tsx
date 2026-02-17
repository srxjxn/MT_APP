import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Text, Portal, Modal, Button, Menu } from 'react-native-paper';
import { useAuthStore } from '@/lib/stores/authStore';
import { useCoachLessonInstances, LessonInstanceWithJoins } from '@/lib/hooks/useLessonInstances';
import { useCreateStudentNote } from '@/lib/hooks/useStudentNotes';
import { LessonCard } from '@/components/lessons/LessonCard';
import { EnrollmentList } from '@/components/lessons/EnrollmentList';
import { NoteForm } from '@/components/students/NoteForm';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { StudentNoteFormData } from '@/lib/validation/studentNote';

export default function CoachSchedule() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const { data: instances, isLoading, refetch, isRefetching } = useCoachLessonInstances();
  const createNote = useCreateStudentNote();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentMenuVisible, setStudentMenuVisible] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; name: string }[]>([]);
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

  return (
    <View style={styles.container} testID="coach-schedule">
      <Text variant="headlineSmall" style={styles.welcome}>
        Welcome, Coach {userProfile?.first_name ?? ''}!
      </Text>
      <FlatList
        data={instances}
        renderItem={({ item }: { item: LessonInstanceWithJoins }) => (
          <LessonCard
            instance={item}
            onPress={() => setSelectedId(item.id)}
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

      <Portal>
        <Modal
          visible={!!selectedId}
          onDismiss={() => { setSelectedId(null); setShowNoteForm(false); setSelectedStudentId(null); }}
          contentContainerStyle={styles.modal}
        >
          {selectedInstance && (
            <ScrollView>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {selectedInstance.template?.name ?? 'Lesson'}
              </Text>
              <Text variant="bodyMedium" style={styles.modalInfo}>
                {selectedInstance.date} • {selectedInstance.start_time} - {selectedInstance.end_time}
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
                    <Menu
                      visible={studentMenuVisible}
                      onDismiss={() => setStudentMenuVisible(false)}
                      anchor={
                        <Button
                          mode="outlined"
                          onPress={() => setStudentMenuVisible(true)}
                          style={styles.dropdown}
                          testID="coach-student-picker"
                        >
                          {selectedStudentId
                            ? enrolledStudents.find((s) => s.id === selectedStudentId)?.name ?? 'Select'
                            : 'Select student'}
                        </Button>
                      }
                    >
                      {enrolledStudents.map((student) => (
                        <Menu.Item
                          key={student.id}
                          onPress={() => {
                            setSelectedStudentId(student.id);
                            setStudentMenuVisible(false);
                          }}
                          title={student.name}
                        />
                      ))}
                    </Menu>
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
  dropdown: {
    marginBottom: SPACING.sm,
  },
  closeButton: {
    marginTop: SPACING.md,
  },
});
