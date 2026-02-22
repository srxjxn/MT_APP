import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING } from '@/constants/theme';
import { ChildGroupAttendance } from '@/lib/hooks/useParentAttendance';

interface MonthlyAttendanceCardProps {
  attendance: ChildGroupAttendance[];
  testID?: string;
}

export function MonthlyAttendanceCard({ attendance, testID }: MonthlyAttendanceCardProps) {
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <Card style={styles.card} testID={testID}>
      <Card.Content>
        <View style={styles.header}>
          <MaterialCommunityIcons name="calendar-check" size={20} color={COLORS.primary} />
          <Text variant="titleSmall" style={styles.title}>This Month ({monthName})</Text>
        </View>
        {attendance.map((child) => (
          <View key={child.studentId} style={styles.childRow}>
            <Text variant="bodyMedium" style={styles.childName}>{child.studentName}</Text>
            <Text variant="bodyMedium" style={styles.count}>
              {child.groupClassesAttended} group class{child.groupClassesAttended !== 1 ? 'es' : ''} attended
            </Text>
          </View>
        ))}
        {attendance.length === 0 && (
          <Text variant="bodySmall" style={styles.empty}>No attendance data this month</Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  childRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  childName: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  count: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  empty: {
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
