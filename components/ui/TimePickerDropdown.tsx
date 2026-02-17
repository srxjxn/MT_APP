import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';

interface TimePickerDropdownProps {
  value: string;
  onSelect: (time: string) => void;
  label?: string;
  error?: string;
  testID?: string;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 0) break;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function to12h(time24: string): string {
  if (!time24) return 'Select time';
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function TimePickerDropdown({ value, onSelect, label, error, testID }: TimePickerDropdownProps) {
  const [visible, setVisible] = useState(false);

  const displayValue = useMemo(() => to12h(value), [value]);

  return (
    <View testID={testID}>
      {label && <Text variant="titleSmall" style={styles.label}>{label}</Text>}
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setVisible(true)}
            style={styles.dropdown}
            contentStyle={styles.dropdownContent}
          >
            {displayValue}
          </Button>
        }
      >
        <ScrollView style={styles.scrollView}>
          {TIME_SLOTS.map((slot) => (
            <Menu.Item
              key={slot}
              onPress={() => { onSelect(slot); setVisible(false); }}
              title={to12h(slot)}
            />
          ))}
        </ScrollView>
      </Menu>
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
  scrollView: {
    maxHeight: 300,
  },
  error: {
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
});
