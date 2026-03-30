import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Button, Text, Menu, Chip } from 'react-native-paper';
import { FormField, DatePickerField, TimePickerDropdown, DurationPicker } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { DAYS_OF_WEEK, LESSON_TYPE_LABELS } from '@/lib/validation/lessonTemplate';
import { Court } from '@/lib/types';

export interface CoachPrivateLessonFormData {
  name: string;
  lesson_type: 'private' | 'semi_private';
  date: string;
  start_time: string;
  duration_minutes: number;
  max_students: number;
  price_cents: number;
  court_id?: string;
  student_id?: string;
  description?: string;
}

interface CoachPrivateLessonFormProps {
  courts?: Court[];
  students?: { id: string; first_name: string; last_name: string }[];
  onSubmit: (data: CoachPrivateLessonFormData) => void;
  loading?: boolean;
  testID?: string;
}

const PRIVATE_LESSON_TYPES = ['private', 'semi_private'] as const;

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getNextOccurrence(dayOfWeek: number): string {
  const today = new Date();
  const todayDay = today.getDay();
  let daysAhead = dayOfWeek - todayDay;
  if (daysAhead <= 0) daysAhead += 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysAhead);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function CoachPrivateLessonForm({
  courts,
  students,
  onSubmit,
  loading = false,
  testID,
}: CoachPrivateLessonFormProps) {
  const [name, setName] = useState('');
  const [lessonType, setLessonType] = useState<'private' | 'semi_private'>('private');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxStudents, setMaxStudents] = useState('1');
  const [courtId, setCourtId] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [courtMenuVisible, setCourtMenuVisible] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [studentMenuVisible, setStudentMenuVisible] = useState(false);

  const selectedCourt = courts?.find((c) => c.id === courtId);
  const selectedStudent = students?.find((s) => s.id === studentId);

  const handleTypeChange = (type: 'private' | 'semi_private') => {
    setLessonType(type);
    setTypeMenuVisible(false);
    setMaxStudents(type === 'private' ? '1' : '3');
  };

  const handleDayPress = (dayValue: number) => {
    setSelectedDay(dayValue);
    const nextDate = getNextOccurrence(dayValue);
    setDate(nextDate);
    setErrors((e) => ({ ...e, date: '' }));
  };

  const handleSubmit = () => {
    const fieldErrors: Record<string, string> = {};

    if (!name.trim()) fieldErrors.name = 'Name is required';
    if (!date) fieldErrors.date = 'Date is required';
    if (!startTime) fieldErrors.start_time = 'Start time is required';
    if (durationMinutes < 15) fieldErrors.duration_minutes = 'Duration must be at least 15 minutes';

    const students = parseInt(maxStudents, 10);
    if (isNaN(students) || students < 1) fieldErrors.max_students = 'Must be at least 1';

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit({
      name: name.trim(),
      lesson_type: lessonType,
      date,
      start_time: startTime,
      duration_minutes: durationMinutes,
      max_students: students,
      price_cents: 0,
      court_id: courtId || undefined,
      student_id: studentId || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <ScrollView style={styles.container} testID={testID ?? 'coach-private-lesson-form'}>
      <FormField
        label="Lesson Name"
        value={name}
        onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
        error={errors.name}
        testID="private-lesson-name"
      />

      <Text variant="titleSmall" style={styles.label}>Lesson Type</Text>
      <Menu
        visible={typeMenuVisible}
        onDismiss={() => setTypeMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setTypeMenuVisible(true)}
            style={styles.dropdown}
            contentStyle={styles.dropdownContent}
          >
            {LESSON_TYPE_LABELS[lessonType] ?? 'Select type'}
          </Button>
        }
      >
        {PRIVATE_LESSON_TYPES.map((type) => (
          <Menu.Item
            key={type}
            onPress={() => handleTypeChange(type)}
            title={LESSON_TYPE_LABELS[type]}
          />
        ))}
      </Menu>

      <Text variant="titleSmall" style={styles.label}>Quick Select Day</Text>
      <View style={styles.chipRow}>
        {DAYS_OF_WEEK.map((day) => (
          <Chip
            key={day.value}
            selected={selectedDay === day.value}
            onPress={() => handleDayPress(day.value)}
            style={styles.chip}
            compact
          >
            {DAY_LABELS[day.value]}
          </Chip>
        ))}
      </View>

      <DatePickerField
        value={date}
        onChange={(v) => { setDate(v); setSelectedDay(null); setErrors((e) => ({ ...e, date: '' })); }}
        label="Date"
        error={errors.date}
        testID="private-lesson-date"
      />

      <TimePickerDropdown
        value={startTime}
        onSelect={(v) => { setStartTime(v); setErrors((e) => ({ ...e, start_time: '' })); }}
        label="Start Time"
        error={errors.start_time}
        testID="private-lesson-start-time"
      />

      <DurationPicker
        value={durationMinutes}
        onChange={setDurationMinutes}
        label="Duration"
        error={errors.duration_minutes}
        testID="private-lesson-duration"
      />

      <FormField
        label="Max Students"
        value={maxStudents}
        onChangeText={(v) => { setMaxStudents(v); setErrors((e) => ({ ...e, max_students: '' })); }}
        error={errors.max_students}
        keyboardType="numeric"
        testID="private-lesson-max-students"
      />

      {courts && courts.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.label}>Court (optional)</Text>
          <Menu
            visible={courtMenuVisible}
            onDismiss={() => setCourtMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setCourtMenuVisible(true)}
                style={styles.dropdown}
                contentStyle={styles.dropdownContent}
              >
                {selectedCourt?.name ?? 'No court selected'}
              </Button>
            }
          >
            <Menu.Item
              onPress={() => { setCourtId(''); setCourtMenuVisible(false); }}
              title="None"
            />
            {courts.map((court) => (
              <Menu.Item
                key={court.id}
                onPress={() => { setCourtId(court.id); setCourtMenuVisible(false); }}
                title={court.name}
              />
            ))}
          </Menu>
        </>
      )}

      {students && students.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.label}>Student (optional)</Text>
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
                {selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : 'No student selected'}
              </Button>
            }
          >
            <ScrollView style={{ maxHeight: 300 }}>
              <Menu.Item
                onPress={() => { setStudentId(''); setStudentMenuVisible(false); }}
                title="None"
              />
              {students.map((student) => (
                <Menu.Item
                  key={student.id}
                  onPress={() => { setStudentId(student.id); setStudentMenuVisible(false); }}
                  title={`${student.first_name} ${student.last_name}`}
                />
              ))}
            </ScrollView>
          </Menu>
        </>
      )}

      <FormField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="private-lesson-description"
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="private-lesson-submit"
      >
        Create Lesson
      </Button>
    </ScrollView>
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
    marginBottom: SPACING.md,
  },
  submitContent: {
    height: LAYOUT.buttonHeight,
  },
});
