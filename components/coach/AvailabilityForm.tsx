import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Menu, Switch } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { availabilitySchema, AvailabilityFormData } from '@/lib/validation/availability';
import { DAYS_OF_WEEK } from '@/lib/validation/lessonTemplate';

interface AvailabilityFormProps {
  initialValues?: Partial<AvailabilityFormData>;
  onSubmit: (data: AvailabilityFormData) => void;
  loading?: boolean;
  submitLabel?: string;
  testID?: string;
}

export function AvailabilityForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  testID,
}: AvailabilityFormProps) {
  const [dayOfWeek, setDayOfWeek] = useState(initialValues?.day_of_week ?? 1);
  const [startTime, setStartTime] = useState(initialValues?.start_time ?? '');
  const [endTime, setEndTime] = useState(initialValues?.end_time ?? '');
  const [isRecurring, setIsRecurring] = useState(initialValues?.is_recurring ?? true);
  const [specificDate, setSpecificDate] = useState(initialValues?.specific_date ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dayMenuVisible, setDayMenuVisible] = useState(false);

  const selectedDay = DAYS_OF_WEEK.find((d) => d.value === dayOfWeek);

  const handleSubmit = () => {
    const result = availabilitySchema.safeParse({
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_recurring: isRecurring,
      specific_date: specificDate || undefined,
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
    <View style={styles.container} testID={testID ?? 'availability-form'}>
      <Text variant="titleSmall" style={styles.label}>Day of Week</Text>
      <Menu
        visible={dayMenuVisible}
        onDismiss={() => setDayMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setDayMenuVisible(true)}
            style={styles.dropdown}
            contentStyle={styles.dropdownContent}
          >
            {selectedDay?.label ?? 'Select day'}
          </Button>
        }
      >
        {DAYS_OF_WEEK.map((day) => (
          <Menu.Item
            key={day.value}
            onPress={() => { setDayOfWeek(day.value); setDayMenuVisible(false); }}
            title={day.label}
          />
        ))}
      </Menu>

      <FormField
        label="Start Time (HH:MM)"
        value={startTime}
        onChangeText={(v) => { setStartTime(v); setErrors((e) => ({ ...e, start_time: '' })); }}
        error={errors.start_time}
        testID="availability-start-time"
      />

      <FormField
        label="End Time (HH:MM)"
        value={endTime}
        onChangeText={(v) => { setEndTime(v); setErrors((e) => ({ ...e, end_time: '' })); }}
        error={errors.end_time}
        testID="availability-end-time"
      />

      <View style={styles.switchRow}>
        <Text variant="titleSmall" style={styles.switchLabel}>Recurring Weekly</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          color={COLORS.primary}
          testID="availability-recurring-switch"
        />
      </View>

      {!isRecurring && (
        <FormField
          label="Specific Date (YYYY-MM-DD)"
          value={specificDate}
          onChangeText={setSpecificDate}
          testID="availability-specific-date"
        />
      )}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="availability-submit"
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 48,
  },
  switchLabel: {
    color: COLORS.textPrimary,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  submitContent: {
    height: LAYOUT.buttonHeight,
  },
});
