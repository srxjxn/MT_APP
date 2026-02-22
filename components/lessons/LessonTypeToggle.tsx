import React from 'react';
import { StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

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
    <SegmentedButtons
      value={value}
      onValueChange={onValueChange}
      buttons={BUTTONS}
      style={[styles.container, style]}
    />
  );
}

const styles = StyleSheet.create({
  container: {},
});
