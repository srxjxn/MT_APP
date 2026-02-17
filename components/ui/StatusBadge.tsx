import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { COLORS } from '@/constants/theme';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#E8F5E9', text: COLORS.primary },
  maintenance: { bg: '#FFF3E0', text: COLORS.warning },
  inactive: { bg: '#FFEBEE', text: COLORS.error },
  scheduled: { bg: '#E3F2FD', text: COLORS.info },
  completed: { bg: '#E8F5E9', text: COLORS.primary },
  cancelled: { bg: '#FFEBEE', text: COLORS.error },
  in_progress: { bg: '#FFF3E0', text: COLORS.warning },
  enrolled: { bg: '#E8F5E9', text: COLORS.primary },
  waitlisted: { bg: '#E3F2FD', text: COLORS.info },
  pending: { bg: '#FFF3E0', text: COLORS.warning },
  paused: { bg: '#FFF3E0', text: COLORS.warning },
  expired: { bg: '#F5F5F5', text: COLORS.textSecondary },
  failed: { bg: '#FFEBEE', text: COLORS.error },
  refunded: { bg: '#E3F2FD', text: COLORS.info },
};

interface StatusBadgeProps {
  status: string;
  testID?: string;
}

export function StatusBadge({ status, testID }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? { bg: '#F5F5F5', text: COLORS.textSecondary };
  return (
    <Chip
      style={[styles.chip, { backgroundColor: colors.bg }]}
      textStyle={[styles.text, { color: colors.text }]}
      testID={testID ?? 'status-badge'}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
