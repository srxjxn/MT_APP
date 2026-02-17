import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Dialog, Portal, Button, Text, Checkbox } from 'react-native-paper';
import { useParentStudents } from '@/lib/hooks/useStudents';
import { useEnrollOrWaitlist } from '@/lib/hooks/useEnrollments';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';

interface EnrollChildDialogProps {
  visible: boolean;
  lessonInstanceId: string;
  maxStudents?: number;
  enrollmentCount?: number;
  onDismiss: () => void;
  testID?: string;
}

export function EnrollChildDialog({ visible, lessonInstanceId, maxStudents, enrollmentCount, onDismiss, testID }: EnrollChildDialogProps) {
  const { data: children } = useParentStudents();
  const enrollOrWaitlist = useEnrollOrWaitlist();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isFull = maxStudents != null && (enrollmentCount ?? 0) >= maxStudents;

  const toggleChild = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnroll = async () => {
    try {
      let waitlistedCount = 0;
      let enrolledCount = 0;
      for (const studentId of selectedIds) {
        const result = await enrollOrWaitlist.mutateAsync({ lessonInstanceId, studentId });
        if (result.wasWaitlisted) {
          waitlistedCount++;
        } else {
          enrolledCount++;
        }
      }
      if (waitlistedCount > 0 && enrolledCount > 0) {
        showSnackbar(`Enrolled ${enrolledCount}, waitlisted ${waitlistedCount}`, 'success');
      } else if (waitlistedCount > 0) {
        showSnackbar(`Added ${waitlistedCount} to waitlist`, 'success');
      } else {
        showSnackbar(`Enrolled ${enrolledCount} child${enrolledCount > 1 ? 'ren' : ''}`, 'success');
      }
      setSelectedIds(new Set());
      onDismiss();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to enroll', 'error');
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} testID={testID ?? 'enroll-child-dialog'}>
        <Dialog.Title>{isFull ? 'Join Waitlist' : 'Enroll Child'}</Dialog.Title>
        <Dialog.Content>
          {isFull && (
            <Text variant="bodyMedium" style={styles.waitlistWarning}>
              This lesson is full — your child will be waitlisted
            </Text>
          )}
          {!children?.length ? (
            <Text variant="bodyMedium">No children to enroll</Text>
          ) : (
            children.map((child) => (
              <View key={child.id} style={styles.row}>
                <Checkbox
                  status={selectedIds.has(child.id) ? 'checked' : 'unchecked'}
                  onPress={() => toggleChild(child.id)}
                  color={COLORS.primary}
                />
                <Text variant="bodyLarge" style={styles.childName}>
                  {child.first_name} {child.last_name}
                </Text>
              </View>
            ))
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={handleEnroll}
            disabled={selectedIds.size === 0}
            loading={enrollOrWaitlist.isPending}
          >
            {isFull ? 'Join Waitlist' : 'Enroll'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  childName: {
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  waitlistWarning: {
    color: COLORS.warning,
    marginBottom: SPACING.sm,
    fontStyle: 'italic',
  },
});
