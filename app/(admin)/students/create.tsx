import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { StudentForm } from '@/components/students/StudentForm';
import { useCreateStudent, useParentUsers } from '@/lib/hooks/useStudents';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS } from '@/constants/theme';
import { StudentFormData } from '@/lib/validation/student';

export default function CreateStudentScreen() {
  const createStudent = useCreateStudent();
  const { data: parentUsers } = useParentUsers();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleSubmit = async (data: StudentFormData) => {
    try {
      await createStudent.mutateAsync(data);
      showSnackbar('Student created successfully', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create student', 'error');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <StudentForm
        parentUsers={parentUsers}
        onSubmit={handleSubmit}
        loading={createStudent.isPending}
        submitLabel="Create Student"
        testID="create-student-form"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
