import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Menu } from 'react-native-paper';
import { FormField, TimePickerDropdown, DurationPicker, DatePickerField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import {
  LESSON_TYPES,
  LESSON_TYPE_LABELS,
} from '@/lib/validation/lessonTemplate';
import { UserProfile, Court } from '@/lib/types';

export interface LessonInstanceFormData {
  name: string;
  lesson_type: string;
  coach_id: string;
  court_id?: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  max_students: number;
  price_cents: number;
  description?: string;
  notes?: string;
}

interface LessonInstanceFormProps {
  coaches?: Pick<UserProfile, 'id' | 'first_name' | 'last_name'>[];
  courts?: Pick<Court, 'id' | 'name'>[];
  onSubmit: (data: LessonInstanceFormData) => void;
  loading?: boolean;
  submitLabel?: string;
  testID?: string;
}

export function LessonInstanceForm({
  coaches,
  courts,
  onSubmit,
  loading = false,
  submitLabel = 'Create Lesson',
  testID,
}: LessonInstanceFormProps) {
  const [name, setName] = useState('');
  const [lessonType, setLessonType] = useState<string>('group');
  const [coachId, setCoachId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxStudents, setMaxStudents] = useState('6');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);
  const [courtMenuVisible, setCourtMenuVisible] = useState(false);

  const selectedCoach = coaches?.find((c) => c.id === coachId);
  const selectedCourt = courts?.find((c) => c.id === courtId);

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Lesson name is required';
    if (!coachId) newErrors.coach_id = 'Coach is required';
    if (!date) newErrors.date = 'Date is required';
    if (!startTime) newErrors.start_time = 'Start time is required';
    if (durationMinutes < 15) newErrors.duration_minutes = 'Duration must be at least 15 minutes';

    const maxStudentsNum = parseInt(maxStudents, 10) || 0;
    if (maxStudentsNum < 1) newErrors.max_students = 'Must allow at least 1 student';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({
      name: name.trim(),
      lesson_type: lessonType,
      coach_id: coachId,
      court_id: courtId || undefined,
      date,
      start_time: startTime,
      duration_minutes: durationMinutes,
      max_students: maxStudentsNum,
      price_cents: 0,
      description: description || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <View style={styles.container} testID={testID ?? 'lesson-instance-form'}>
      <FormField
        label="Lesson Name"
        value={name}
        onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
        error={errors.name}
        testID="instance-name-input"
      />

      <Text variant="titleSmall" style={styles.label}>Lesson Type</Text>
      <Menu
        visible={typeMenuVisible}
        onDismiss={() => setTypeMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setTypeMenuVisible(true)} style={styles.dropdown} contentStyle={styles.dropdownContent}>
            {LESSON_TYPE_LABELS[lessonType] ?? 'Select type'}
          </Button>
        }
      >
        {LESSON_TYPES.map((type) => (
          <Menu.Item key={type} onPress={() => { setLessonType(type); setTypeMenuVisible(false); }} title={LESSON_TYPE_LABELS[type]} />
        ))}
      </Menu>

      <Text variant="titleSmall" style={styles.label}>Coach</Text>
      <Menu
        visible={coachMenuVisible}
        onDismiss={() => setCoachMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setCoachMenuVisible(true)} style={styles.dropdown} contentStyle={styles.dropdownContent}>
            {selectedCoach ? `${selectedCoach.first_name} ${selectedCoach.last_name}` : 'Select coach'}
          </Button>
        }
      >
        {coaches?.map((coach) => (
          <Menu.Item
            key={coach.id}
            onPress={() => { setCoachId(coach.id); setCoachMenuVisible(false); setErrors((e) => ({ ...e, coach_id: '' })); }}
            title={`${coach.first_name} ${coach.last_name}`}
          />
        ))}
      </Menu>
      {errors.coach_id && <Text variant="bodySmall" style={styles.error}>{errors.coach_id}</Text>}

      <Text variant="titleSmall" style={styles.label}>Court (optional)</Text>
      <Menu
        visible={courtMenuVisible}
        onDismiss={() => setCourtMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setCourtMenuVisible(true)} style={styles.dropdown} contentStyle={styles.dropdownContent}>
            {selectedCourt ? selectedCourt.name : 'Select court'}
          </Button>
        }
      >
        <Menu.Item onPress={() => { setCourtId(''); setCourtMenuVisible(false); }} title="None" />
        {courts?.map((court) => (
          <Menu.Item key={court.id} onPress={() => { setCourtId(court.id); setCourtMenuVisible(false); }} title={court.name} />
        ))}
      </Menu>

      <DatePickerField
        value={date}
        onChange={(v) => { setDate(v); setErrors((e) => ({ ...e, date: '' })); }}
        label="Date"
        error={errors.date}
        testID="instance-date-input"
      />

      <TimePickerDropdown
        value={startTime}
        onSelect={(v) => { setStartTime(v); setErrors((e) => ({ ...e, start_time: '' })); }}
        label="Start Time"
        error={errors.start_time}
        testID="instance-start-time-input"
      />

      <DurationPicker
        value={durationMinutes}
        onChange={setDurationMinutes}
        label="Duration"
        error={errors.duration_minutes}
        testID="instance-duration-input"
      />

      <FormField
        label="Max Students"
        value={maxStudents}
        onChangeText={setMaxStudents}
        keyboardType="numeric"
        error={errors.max_students}
        testID="instance-max-students-input"
      />

      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="instance-description-input"
      />

      <FormField
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        testID="instance-notes-input"
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="instance-submit"
      >
        {submitLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
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
  submitButton: {
    marginTop: SPACING.lg,
  },
  submitContent: {
    height: LAYOUT.buttonHeight,
  },
});
