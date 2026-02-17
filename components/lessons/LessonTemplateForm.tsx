import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Menu } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import {
  lessonTemplateSchema,
  LessonTemplateFormData,
  LESSON_TYPES,
  LESSON_TYPE_LABELS,
  DAYS_OF_WEEK,
} from '@/lib/validation/lessonTemplate';
import { UserProfile, Court } from '@/lib/types';

interface LessonTemplateFormProps {
  initialValues?: Partial<LessonTemplateFormData>;
  coaches?: Pick<UserProfile, 'id' | 'first_name' | 'last_name'>[];
  courts?: Pick<Court, 'id' | 'name'>[];
  onSubmit: (data: LessonTemplateFormData) => void;
  loading?: boolean;
  submitLabel?: string;
  testID?: string;
}

export function LessonTemplateForm({
  initialValues,
  coaches,
  courts,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  testID,
}: LessonTemplateFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [lessonType, setLessonType] = useState<string>(initialValues?.lesson_type ?? 'group');
  const [coachId, setCoachId] = useState(initialValues?.coach_id ?? '');
  const [courtId, setCourtId] = useState(initialValues?.court_id ?? '');
  const [dayOfWeek, setDayOfWeek] = useState(initialValues?.day_of_week ?? 1);
  const [startTime, setStartTime] = useState(initialValues?.start_time ?? '');
  const [durationMinutes, setDurationMinutes] = useState(String(initialValues?.duration_minutes ?? '60'));
  const [maxStudents, setMaxStudents] = useState(String(initialValues?.max_students ?? '6'));
  const [priceCents, setPriceCents] = useState(String(initialValues?.price_cents ?? '0'));
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);
  const [courtMenuVisible, setCourtMenuVisible] = useState(false);
  const [dayMenuVisible, setDayMenuVisible] = useState(false);

  const selectedCoach = coaches?.find((c) => c.id === coachId);
  const selectedCourt = courts?.find((c) => c.id === courtId);
  const selectedDay = DAYS_OF_WEEK.find((d) => d.value === dayOfWeek);

  const handleSubmit = () => {
    const result = lessonTemplateSchema.safeParse({
      name,
      lesson_type: lessonType,
      coach_id: coachId,
      court_id: courtId || undefined,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_minutes: parseInt(durationMinutes, 10) || 0,
      max_students: parseInt(maxStudents, 10) || 0,
      price_cents: parseInt(priceCents, 10) || 0,
      description: description || undefined,
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
  };

  return (
    <View style={styles.container} testID={testID ?? 'lesson-template-form'}>
      <FormField
        label="Lesson Name"
        value={name}
        onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
        error={errors.name}
        testID="template-name-input"
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

      <Text variant="titleSmall" style={styles.label}>Day of Week</Text>
      <Menu
        visible={dayMenuVisible}
        onDismiss={() => setDayMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setDayMenuVisible(true)} style={styles.dropdown} contentStyle={styles.dropdownContent}>
            {selectedDay?.label ?? 'Select day'}
          </Button>
        }
      >
        {DAYS_OF_WEEK.map((day) => (
          <Menu.Item key={day.value} onPress={() => { setDayOfWeek(day.value); setDayMenuVisible(false); }} title={day.label} />
        ))}
      </Menu>

      <FormField
        label="Start Time (HH:MM)"
        value={startTime}
        onChangeText={(v) => { setStartTime(v); setErrors((e) => ({ ...e, start_time: '' })); }}
        error={errors.start_time}
        testID="template-start-time-input"
      />

      <FormField
        label="Duration (minutes)"
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        keyboardType="numeric"
        error={errors.duration_minutes}
        testID="template-duration-input"
      />

      <FormField
        label="Max Students"
        value={maxStudents}
        onChangeText={setMaxStudents}
        keyboardType="numeric"
        error={errors.max_students}
        testID="template-max-students-input"
      />

      <FormField
        label="Price (cents)"
        value={priceCents}
        onChangeText={setPriceCents}
        keyboardType="numeric"
        error={errors.price_cents}
        testID="template-price-input"
      />

      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="template-description-input"
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="template-submit"
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
