import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { WorkLogInstance } from '@/lib/hooks/useCoachPayroll';

interface WorkLogItemProps {
  instance: WorkLogInstance;
  testID?: string;
}

export function WorkLogItem({ instance, testID }: WorkLogItemProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.row}>
        <Text variant="bodyMedium" style={styles.date}>{instance.date}</Text>
        <Text variant="bodySmall" style={styles.time}>
          {instance.start_time} - {instance.end_time}
        </Text>
      </View>
      <View style={styles.row}>
        <Text variant="bodySmall" style={styles.name}>{instance.templateName}</Text>
        <Chip compact style={styles.chip}>
          {instance.lessonType === 'group' ? 'Group' : 'Private'} • {instance.durationMinutes}min
        </Chip>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  time: {
    color: COLORS.textSecondary,
  },
  name: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
});
