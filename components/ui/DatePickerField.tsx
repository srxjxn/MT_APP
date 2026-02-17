import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Text } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';

interface DatePickerFieldProps {
  value: string;
  onChange: (dateStr: string) => void;
  label?: string;
  error?: string;
  testID?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return 'Select date';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseValue(value: string): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function DatePickerField({ value, onChange, label, error, testID, minimumDate, maximumDate }: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      onChange(toDateStr(selectedDate));
      if (Platform.OS === 'ios') {
        setShowPicker(false);
      }
    }
  };

  return (
    <View testID={testID}>
      {label && <Text variant="titleSmall" style={styles.label}>{label}</Text>}
      <Button
        mode="outlined"
        onPress={() => setShowPicker(true)}
        style={styles.dropdown}
        contentStyle={styles.dropdownContent}
      >
        {formatDisplay(value)}
      </Button>
      {showPicker && (
        <DateTimePicker
          value={parseValue(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
      {error ? <Text variant="bodySmall" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
