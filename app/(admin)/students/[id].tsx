import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, Portal, Modal, ProgressBar, Card } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { StudentForm } from '@/components/students/StudentForm';
import { NoteCard } from '@/components/students/NoteCard';
import { NoteForm } from '@/components/students/NoteForm';
import { useStudent, useUpdateStudent, useDeleteStudent, useParentUsers } from '@/lib/hooks/useStudents';
import { useStudentNotes, useCreateStudentNote, useDeleteStudentNote } from '@/lib/hooks/useStudentNotes';
import { useStudentAttendanceStats } from '@/lib/hooks/useEnrollments';
import { LoadingScreen, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { StudentFormData } from '@/lib/validation/student';
import { StudentNoteFormData } from '@/lib/validation/studentNote';

export default function EditStudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: student, isLoading } = useStudent(id!);
  const { data: parentUsers } = useParentUsers();
  const { data: notes } = useStudentNotes(id!);
  const { data: attendanceStats } = useStudentAttendanceStats(id!);
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const createNote = useCreateStudentNote();
  const deleteNote = useDeleteStudentNote();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  if (isLoading || !student) {
    return <LoadingScreen message="Loading student..." />;
  }

  const handleSubmit = async (data: StudentFormData) => {
    try {
      await updateStudent.mutateAsync({ id: student.id, ...data });
      showSnackbar('Student updated successfully', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update student', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStudent.mutateAsync(student.id);
      showSnackbar('Student deleted', 'success');
      setShowDeleteDialog(false);
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete student', 'error');
      setShowDeleteDialog(false);
    }
  };

  const handleAddNote = async (data: StudentNoteFormData) => {
    try {
      await createNote.mutateAsync(data);
      showSnackbar('Note added', 'success');
      setShowNoteForm(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to add note', 'error');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      showSnackbar('Note deleted', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete note', 'error');
    }
  };

  const calculateAge = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {student.date_of_birth && (
        <Text variant="bodyLarge" style={styles.ageText}>
          Age: {calculateAge(student.date_of_birth)} years
        </Text>
      )}
      <StudentForm
        initialValues={{
          first_name: student.first_name,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth ?? undefined,
          skill_level: student.skill_level,
          medical_notes: student.medical_notes ?? undefined,
          parent_id: student.parent_id,
        }}
        parentUsers={parentUsers}
        onSubmit={handleSubmit}
        loading={updateStudent.isPending}
        submitLabel="Update Student"
        testID="edit-student-form"
      />

      <View style={styles.deleteSection}>
        <Button
          mode="outlined"
          onPress={() => setShowDeleteDialog(true)}
          textColor={COLORS.error}
          style={styles.deleteButton}
          contentStyle={styles.deleteContent}
          loading={deleteStudent.isPending}
          testID="student-delete-button"
        >
          Delete Student
        </Button>
      </View>

      {attendanceStats && attendanceStats.total > 0 && (
        <View style={styles.attendanceSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Attendance</Text>
          <Text variant="bodyMedium" style={styles.attendanceSummary}>
            Attended {attendanceStats.attended} of {attendanceStats.total} lessons
            ({attendanceStats.total > 0 ? Math.round((attendanceStats.attended / attendanceStats.total) * 100) : 0}%)
          </Text>
          {attendanceStats.unmarked > 0 && (
            <Text variant="bodySmall" style={styles.attendanceUnmarked}>
              {attendanceStats.unmarked} not yet recorded
            </Text>
          )}
          <ProgressBar
            progress={attendanceStats.total > 0 ? attendanceStats.attended / attendanceStats.total : 0}
            color={COLORS.success}
            style={styles.attendanceBar}
          />
          {attendanceStats.records.slice(0, 10).map((record) => (
            <Card key={record.id} style={styles.attendanceRecord}>
              <Card.Content style={styles.attendanceRow}>
                <MaterialCommunityIcons
                  name={record.attended === true ? 'check-circle' : record.attended === false ? 'close-circle' : 'help-circle'}
                  size={20}
                  color={record.attended === true ? COLORS.success : record.attended === false ? COLORS.error : COLORS.textSecondary}
                />
                <View style={styles.attendanceInfo}>
                  <Text variant="bodyMedium" style={styles.attendanceName}>{record.lessonName}</Text>
                  <Text variant="bodySmall" style={styles.attendanceDate}>{record.date} • {record.startTime}</Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.notesSection}>
        <View style={styles.notesSectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Notes</Text>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setShowNoteForm(true)}
            compact
            testID="add-note-button"
          >
            Add Note
          </Button>
        </View>
        {notes?.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            canDelete
            onDelete={handleDeleteNote}
          />
        ))}
        {(!notes || notes.length === 0) && (
          <Text variant="bodyMedium" style={styles.emptyText}>No notes yet</Text>
        )}
      </View>

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Student"
        message={`Are you sure you want to delete "${student.first_name} ${student.last_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        testID="student-delete-dialog"
      />

      <Portal>
        <Modal
          visible={showNoteForm}
          onDismiss={() => setShowNoteForm(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Add Note</Text>
          <NoteForm
            studentId={id!}
            onSubmit={handleAddNote}
            loading={createNote.isPending}
            testID="student-note-form"
          />
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  ageText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  deleteSection: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  deleteButton: {
    borderColor: COLORS.error,
  },
  deleteContent: {
    height: LAYOUT.buttonHeight,
  },
  attendanceSection: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  attendanceSummary: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  attendanceUnmarked: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  attendanceBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: SPACING.sm,
  },
  attendanceRecord: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  attendanceDate: {
    color: COLORS.textSecondary,
  },
  notesSection: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.md,
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
});
