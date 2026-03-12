import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { SPACING } from '@/constants/theme';

const BUTTONS = [
  { value: 'all', label: 'All' },
  { value: 'group', label: 'Group' },
  { value: 'private', label: 'Private' },
];

interface LessonTypeToggleProps {
  value: string;
  onValueChange: (value: string) => void;
  style?: object;
}

export function LessonTypeToggle({ value, onValueChange, style }: LessonTypeToggleProps) {
  return (
    <View style={[styles.container, style]}>
      {BUTTONS.map((btn) => (
        <Chip
          key={btn.value}
          selected={value === btn.value}
          onPress={() => onValueChange(btn.value)}
          style={styles.chip}
          compact
        >
          {btn.label}
        </Chip>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  chip: {},
});
