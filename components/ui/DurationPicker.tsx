import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';

interface DurationPickerProps {
  value: number;
  onChange: (minutes: number) => void;
  label?: string;
  error?: string;
  testID?: string;
}

const HOURS = [0, 1, 2, 3, 4];
const MINUTES = [0, 15, 30, 45];

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function DurationPicker({ value, onChange, label, error, testID }: DurationPickerProps) {
  const [hoursVisible, setHoursVisible] = useState(false);
  const [minsVisible, setMinsVisible] = useState(false);

  const hours = Math.floor(value / 60);
  const mins = value % 60;

  const setHours = (h: number) => {
    onChange(h * 60 + mins);
    setHoursVisible(false);
  };

  const setMins = (m: number) => {
    onChange(hours * 60 + m);
    setMinsVisible(false);
  };

  return (
    <View testID={testID}>
      {label && <Text variant="titleSmall" style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        <View style={styles.half}>
          <Menu
            visible={hoursVisible}
            onDismiss={() => setHoursVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setHoursVisible(true)}
                style={styles.dropdown}
                contentStyle={styles.dropdownContent}
              >
                {`${hours} hr`}
              </Button>
            }
          >
            {HOURS.map((h) => (
              <Menu.Item key={h} onPress={() => setHours(h)} title={`${h} hr`} />
            ))}
          </Menu>
        </View>
        <View style={styles.half}>
          <Menu
            visible={minsVisible}
            onDismiss={() => setMinsVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setMinsVisible(true)}
                style={styles.dropdown}
                contentStyle={styles.dropdownContent}
              >
                {`${mins} min`}
              </Button>
            }
          >
            {MINUTES.map((m) => (
              <Menu.Item key={m} onPress={() => setMins(m)} title={`${m} min`} />
            ))}
          </Menu>
        </View>
      </View>
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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  half: {
    flex: 1,
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
