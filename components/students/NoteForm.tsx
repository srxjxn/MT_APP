import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Switch, Text } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { studentNoteSchema, StudentNoteFormData } from '@/lib/validation/studentNote';

interface NoteFormProps {
  studentId: string;
  lessonInstanceId?: string;
  onSubmit: (data: StudentNoteFormData) => void;
  loading?: boolean;
  testID?: string;
}

export function NoteForm({ studentId, lessonInstanceId, onSubmit, loading = false, testID }: NoteFormProps) {
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const result = studentNoteSchema.safeParse({
      content,
      is_private: isPrivate,
      student_id: studentId,
      lesson_instance_id: lessonInstanceId || undefined,
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

    setErrors({});
    onSubmit(result.data);
    setContent('');
    setIsPrivate(false);
  };

  return (
    <View style={styles.container} testID={testID ?? 'note-form'}>
      <FormField
        label="Note"
        value={content}
        onChangeText={(v) => { setContent(v); setErrors((e) => ({ ...e, content: '' })); }}
        error={errors.content}
        multiline
        testID="note-content-input"
      />

      <View style={styles.switchRow}>
        <Text variant="bodyMedium" style={styles.switchLabel}>Private note</Text>
        <Switch
          value={isPrivate}
          onValueChange={setIsPrivate}
          color={COLORS.primary}
          testID="note-private-switch"
        />
      </View>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="note-submit"
      >
        Add Note
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  switchLabel: {
    color: COLORS.textPrimary,
  },
  submitButton: {
    marginTop: SPACING.sm,
  },
  submitContent: {
    height: LAYOUT.buttonHeight,
  },
});
