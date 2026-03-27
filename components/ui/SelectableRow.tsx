import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';

interface SelectableRowProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export function SelectableRow({ label, selected, onPress, testID }: SelectableRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      style={[
        styles.row,
        selected ? styles.rowSelected : styles.rowUnselected,
      ]}
    >
      <Text variant="bodyLarge" style={styles.label}>{label}</Text>
      <MaterialCommunityIcons
        name={selected ? 'check-circle' : 'circle-outline'}
        size={24}
        color={selected ? COLORS.primary : COLORS.textDisabled}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: SPACING.sm,
  },
  rowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.successLight,
  },
  rowUnselected: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  label: {
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.sm,
  },
});
