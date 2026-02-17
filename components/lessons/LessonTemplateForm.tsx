import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Menu, Chip } from 'react-native-paper';
import { FormField, TimePickerDropdown, DurationPicker } from '@/components/ui';
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
  onSubmit: (data: LessonTemplateFormData[]) => void;
  loading?: boolean;
  submitLabel?: string;
  testID?: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialValues?.day_of_week != null ? [initialValues.day_of_week] : []
  );
  const [startTime, setStartTime] = useState(initialValues?.start_time ?? '');
  const [durationMinutes, setDurationMinutes] = useState(initialValues?.duration_minutes ?? 60);
  const [maxStudents, setMaxStudents] = useState(String(initialValues?.max_students ?? '6'));
  const [priceDollars, setPriceDollars] = useState(
    initialValues?.price_cents ? (initialValues.price_cents / 100).toFixed(2) : '0'
  );
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);
  const [courtMenuVisible, setCourtMenuVisible] = useState(false);

  const selectedCoach = coaches?.find((c) => c.id === coachId);
  const selectedCourt = courts?.find((c) => c.id === courtId);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
    setErrors((e) => ({ ...e, day_of_week: '' }));
  };

  const handleSubmit = () => {
    if (selectedDays.length === 0) {
      setErrors((prev) => ({ ...prev, day_of_week: 'Select at least one day' }));
      return;
    }

    const priceCents = Math.round(parseFloat(priceDollars || '0') * 100);

    const baseData = {
      name,
      lesson_type: lessonType,
      coach_id: coachId,
      court_id: courtId || undefined,
      start_time: startTime,
      duration_minutes: durationMinutes,
      max_students: parseInt(maxStudents, 10) || 0,
      price_cents: priceCents,
      description: description || undefined,
    };

    // Validate with first day to check all common fields
    const result = lessonTemplateSchema.safeParse({
      ...baseData,
      day_of_week: selectedDays[0],
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
    const dataArray: LessonTemplateFormData[] = selectedDays.map((day) => ({
      ...baseData,
      lesson_type: lessonType as LessonTemplateFormData['lesson_type'],
      day_of_week: day,
    }));
    onSubmit(dataArray);
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

      <Text variant="titleSmall" style={styles.label}>Days of Week</Text>
      <View style={styles.chipRow}>
        {DAYS_OF_WEEK.map((day) => (
          <Chip
            key={day.value}
            selected={selectedDays.includes(day.value)}
            onPress={() => toggleDay(day.value)}
            style={styles.chip}
            compact
          >
            {DAY_LABELS[day.value]}
          </Chip>
        ))}
      </View>
      {errors.day_of_week && <Text variant="bodySmall" style={styles.error}>{errors.day_of_week}</Text>}

      <TimePickerDropdown
        value={startTime}
        onSelect={(v) => { setStartTime(v); setErrors((e) => ({ ...e, start_time: '' })); }}
        label="Start Time"
        error={errors.start_time}
        testID="template-start-time-input"
      />

      <DurationPicker
        value={durationMinutes}
        onChange={setDurationMinutes}
        label="Duration"
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
        label="Price ($)"
        value={priceDollars}
        onChangeText={setPriceDollars}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: SPACING.xs,
  },
  chip: {
    marginBottom: 2,
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
