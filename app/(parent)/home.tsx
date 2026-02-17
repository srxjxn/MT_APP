import React, { useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Card, Text, Button, Portal, Modal } from 'react-native-paper';
import { useAuthStore } from '@/lib/stores/authStore';
import { useParentStudents, useCreateStudent } from '@/lib/hooks/useStudents';
import { useParentUpcomingLessons } from '@/lib/hooks/useLessonInstances';
import { useStudentNotes } from '@/lib/hooks/useStudentNotes';
import { useUIStore } from '@/lib/stores/uiStore';
import { StudentForm } from '@/components/students/StudentForm';
import { NoteCard } from '@/components/students/NoteCard';
import { LoadingScreen, EmptyState, StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { Student } from '@/lib/types';
import { StudentFormData } from '@/lib/validation/student';
import { LessonInstanceWithJoins } from '@/lib/hooks/useLessonInstances';

function StudentNotesModal({ studentId, studentName, visible, onDismiss }: {
  studentId: string;
  studentName: string;
  visible: boolean;
  onDismiss: () => void;
}) {
  const { data: notes } = useStudentNotes(studentId);
  const publicNotes = notes?.filter((n) => !n.is_private) ?? [];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <ScrollView>
          <Text variant="titleLarge" style={styles.modalTitle}>
            Notes for {studentName}
          </Text>
          {publicNotes.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyNotes}>No notes yet</Text>
          ) : (
            publicNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))
          )}
          <Button mode="outlined" onPress={onDismiss} style={styles.closeButton}>
            Close
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

export default function ParentHome() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const { data: students, isLoading, refetch, isRefetching } = useParentStudents();
  const { data: upcomingData } = useParentUpcomingLessons();
  const createStudent = useCreateStudent();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notesStudent, setNotesStudent] = useState<{ id: string; name: string } | null>(null);

  const handleAddChild = async (data: StudentFormData) => {
    try {
      await createStudent.mutateAsync(data);
      showSnackbar('Child added successfully', 'success');
      setShowAddForm(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to add child', 'error');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading..." testID="parent-home-loading" />;
  }

  // Collect upcoming lessons across all children, limited to 5
  const upcomingLessons: { studentName: string; instance: LessonInstanceWithJoins }[] = [];
  if (upcomingData) {
    for (const group of upcomingData) {
      for (const instance of group.instances) {
        upcomingLessons.push({ studentName: group.studentName, instance });
      }
    }
    upcomingLessons.sort((a, b) => {
      const dateComp = a.instance.date.localeCompare(b.instance.date);
      if (dateComp !== 0) return dateComp;
      return a.instance.start_time.localeCompare(b.instance.start_time);
    });
    upcomingLessons.splice(5);
  }

  const renderStudent = ({ item }: { item: Student }) => (
    <Card style={styles.card} testID={`child-card-${item.id}`}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.name}>
            {item.first_name} {item.last_name}
          </Text>
          <StatusBadge status={item.skill_level} />
        </View>
        {item.date_of_birth && (
          <Text variant="bodySmall" style={styles.detail}>
            Date of Birth: {item.date_of_birth}
          </Text>
        )}
        <Button
          mode="text"
          icon="note-text"
          onPress={() => setNotesStudent({ id: item.id, name: `${item.first_name} ${item.last_name}` })}
          compact
          style={styles.viewNotesButton}
          testID={`view-notes-${item.id}`}
        >
          View Notes
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container} testID="parent-home">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        <Text variant="headlineSmall" style={styles.welcome}>
          Welcome, {userProfile?.first_name ?? 'Parent'}!
        </Text>

        {upcomingLessons.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Upcoming Lessons
            </Text>
            {upcomingLessons.map(({ studentName, instance }) => (
              <Card key={`${instance.id}-${studentName}`} style={styles.upcomingCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.upcomingChild}>{studentName}</Text>
                  <Text variant="titleSmall" style={styles.upcomingName}>
                    {instance.template?.name ?? 'Lesson'}
                  </Text>
                  <Text variant="bodySmall" style={styles.detail}>
                    {instance.date} • {instance.start_time} - {instance.end_time}
                  </Text>
                  <Text variant="bodySmall" style={styles.detail}>
                    {instance.coach ? `${instance.coach.first_name} ${instance.coach.last_name}` : ''}
                    {instance.court ? ` • ${instance.court.name}` : ''}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
        {upcomingLessons.length === 0 && (students?.length ?? 0) > 0 && (
          <View style={styles.upcomingSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Upcoming Lessons
            </Text>
            <Text variant="bodyMedium" style={styles.emptyNotes}>No upcoming lessons</Text>
          </View>
        )}

        <Text variant="titleMedium" style={styles.sectionTitle}>
          My Children
        </Text>
        {students?.map((student) => renderStudent({ item: student }))}
        {(!students || students.length === 0) && (
          <EmptyState
            icon="account-child"
            title="No Children Yet"
            description="Add your child to start enrolling in lessons"
            actionLabel="Add Child"
            onAction={() => setShowAddForm(true)}
          />
        )}
        {(students?.length ?? 0) > 0 && (
          <Button
            mode="contained"
            onPress={() => setShowAddForm(true)}
            style={styles.addButton}
            testID="add-child-button"
          >
            Add Child
          </Button>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={showAddForm}
          onDismiss={() => setShowAddForm(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Add Child</Text>
          <StudentForm
            initialValues={{ parent_id: userProfile?.id }}
            showParentPicker={false}
            onSubmit={handleAddChild}
            loading={createStudent.isPending}
            submitLabel="Add Child"
            testID="add-child-form"
          />
        </Modal>
      </Portal>

      {notesStudent && (
        <StudentNotesModal
          studentId={notesStudent.id}
          studentName={notesStudent.name}
          visible={!!notesStudent}
          onDismiss={() => setNotesStudent(null)}
        />
      )}
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
  upcomingSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  upcomingCard: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  upcomingChild: {
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  upcomingName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    paddingBottom: SPACING.sm,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  detail: {
    color: COLORS.textSecondary,
  },
  viewNotesButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  addButton: {
    margin: SPACING.md,
  },
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    padding: SPACING.md,
    paddingBottom: 0,
  },
  emptyNotes: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  closeButton: {
    margin: SPACING.md,
  },
});
