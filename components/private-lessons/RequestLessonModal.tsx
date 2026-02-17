import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Portal, Modal, Text, Button, Menu, Snackbar } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { DatePickerField, TimePickerDropdown } from '@/components/ui';
import { useParentStudents } from '@/lib/hooks/useStudents';
import { useCoachDirectory } from '@/lib/hooks/useCoachPricing';
import { useCreateLessonRequest } from '@/lib/hooks/useLessonRequests';
import { lessonRequestSchema } from '@/lib/validation/lessonRequest';

interface RequestLessonModalProps {
  visible: boolean;
  onDismiss: () => void;
  initialCoachId?: string;
  initialStudentId?: string;
}

export function RequestLessonModal({
  visible,
  onDismiss,
  initialCoachId,
  initialStudentId,
}: RequestLessonModalProps) {
  const { data: students } = useParentStudents();
  const { data: coaches } = useCoachDirectory();
  const createRequest = useCreateLessonRequest();

  const [studentId, setStudentId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [studentMenuVisible, setStudentMenuVisible] = useState(false);
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    if (visible) {
      setStudentId(initialStudentId ?? '');
      setCoachId(initialCoachId ?? '');
      setPreferredDate('');
      setPreferredTime('');
      setErrors({});
    }
  }, [visible, initialStudentId, initialCoachId]);

  const selectedStudent = students?.find((s) => s.id === studentId);
  const selectedCoach = coaches?.find((c) => c.id === coachId);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const handleSubmit = async () => {
    const result = lessonRequestSchema.safeParse({
      student_id: studentId,
      coach_id: coachId,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await createRequest.mutateAsync({
        student_id: studentId,
        coach_id: coachId,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
      });
      setSnackbar('Lesson request submitted!');
      onDismiss();
    } catch (err: any) {
      setSnackbar(err.message ?? 'Failed to submit request');
    }
  };

  return (
    <>
      <Portal>
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Text variant="titleLarge" style={styles.title}>Request Private Lesson</Text>

            {/* Student Picker */}
            <Text variant="titleSmall" style={styles.label}>Student</Text>
            <Menu
              visible={studentMenuVisible}
              onDismiss={() => setStudentMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setStudentMenuVisible(true)}
                  style={styles.dropdown}
                  contentStyle={styles.dropdownContent}
                >
                  {selectedStudent
                    ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
                    : 'Select student'}
                </Button>
              }
            >
              {(students ?? []).map((s) => (
                <Menu.Item
                  key={s.id}
                  onPress={() => { setStudentId(s.id); setStudentMenuVisible(false); }}
                  title={`${s.first_name} ${s.last_name}`}
                />
              ))}
            </Menu>
            {errors.student_id && <Text variant="bodySmall" style={styles.error}>{errors.student_id}</Text>}

            {/* Coach Picker */}
            <Text variant="titleSmall" style={styles.label}>Coach</Text>
            <Menu
              visible={coachMenuVisible}
              onDismiss={() => setCoachMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setCoachMenuVisible(true)}
                  style={styles.dropdown}
                  contentStyle={styles.dropdownContent}
                >
                  {selectedCoach
                    ? `${selectedCoach.first_name} ${selectedCoach.last_name}`
                    : 'Select coach'}
                </Button>
              }
            >
              {(coaches ?? []).map((c) => (
                <Menu.Item
                  key={c.id}
                  onPress={() => { setCoachId(c.id); setCoachMenuVisible(false); }}
                  title={`${c.first_name} ${c.last_name}`}
                />
              ))}
            </Menu>
            {errors.coach_id && <Text variant="bodySmall" style={styles.error}>{errors.coach_id}</Text>}

            {/* Date */}
            <DatePickerField
              value={preferredDate}
              onChange={setPreferredDate}
              label="Preferred Date"
              error={errors.preferred_date}
              minimumDate={tomorrow}
            />

            {/* Time */}
            <TimePickerDropdown
              value={preferredTime}
              onSelect={setPreferredTime}
              label="Preferred Time"
              error={errors.preferred_time}
            />

            <View style={styles.actions}>
              <Button mode="outlined" onPress={onDismiss} style={styles.actionButton}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={createRequest.isPending}
                disabled={createRequest.isPending}
                style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
              >
                Submit Request
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 12,
    maxHeight: '90%',
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  label: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
  },
  dropdown: {
    marginBottom: SPACING.xs,
  },
  dropdownContent: {
    height: LAYOUT.buttonHeight,
  },
  error: {
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  actionButton: {
    minWidth: 120,
  },
});
