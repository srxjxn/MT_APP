import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, Button, Portal, Dialog } from 'react-native-paper';
import { StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LessonInstanceWithJoins, useAdditionalCoaches, useAddAdditionalCoach, useRemoveAdditionalCoach } from '@/lib/hooks/useLessonInstances';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { useUIStore } from '@/lib/stores/uiStore';
import { LESSON_TYPE_LABELS } from '@/lib/validation/lessonTemplate';
import { formatTime } from '@/lib/utils/formatTime';

interface LessonCardProps {
  instance: LessonInstanceWithJoins;
  onPress?: () => void;
  adminCoachManagement?: boolean;
  testID?: string;
}

export function LessonCard({ instance, onPress, adminCoachManagement, testID }: LessonCardProps) {
  const maxStudents = instance.max_students;
  const lessonType = instance.lesson_type;
  const canManageCoaches = adminCoachManagement && !instance._isVirtual && instance.status === 'scheduled';
  const { data: additionalCoaches } = useAdditionalCoaches(canManageCoaches ? instance.id : undefined);
  const addCoach = useAddAdditionalCoach();
  const removeCoach = useRemoveAdditionalCoach();
  const { data: allCoaches } = useCoachUsers();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showAddCoach, setShowAddCoach] = useState(false);

  const handleAddCoach = async (coachId: string) => {
    try {
      await addCoach.mutateAsync({ instanceId: instance.id, coachId });
      showSnackbar('Coach added', 'success');
      setShowAddCoach(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to add coach', 'error');
    }
  };

  return (
    <>
      <Card style={[styles.card, instance._isVirtual && styles.virtualCard]} onPress={onPress} testID={testID}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.name}>
              {instance.name}
            </Text>
            {instance._isVirtual ? (
              <Chip compact style={styles.templateChip} textStyle={styles.templateChipText}>Template</Chip>
            ) : (
              <StatusBadge status={instance.status} />
            )}
          </View>
          <Text variant="bodyMedium" style={styles.detail}>
            {instance.date} • {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
          </Text>
          <Text variant="bodyMedium" style={styles.detail}>
            {instance.coach ? `${instance.coach.first_name} ${instance.coach.last_name}` : ''}
            {instance.court ? ` • ${instance.court.name}` : ''}
          </Text>
          {canManageCoaches && additionalCoaches && additionalCoaches.length > 0 && (
            <View style={styles.additionalCoachesRow}>
              {additionalCoaches.map((ac) => (
                <Chip
                  key={ac.id}
                  compact
                  onClose={() => removeCoach.mutate({ id: ac.id, instanceId: instance.id })}
                  style={styles.coachChip}
                  testID={`card-additional-coach-${ac.coach_id}`}
                >
                  {ac.coach.first_name} {ac.coach.last_name}
                </Chip>
              ))}
            </View>
          )}
          {canManageCoaches && (
            <Button
              mode="text"
              icon="account-plus"
              onPress={() => setShowAddCoach(true)}
              compact
              style={styles.addCoachButton}
              testID={`card-add-coach-${instance.id}`}
            >
              Add Coach
            </Button>
          )}
          {instance.description && (
            <Text variant="bodySmall" style={styles.descriptionSnippet} numberOfLines={1}>
              {instance.description}
            </Text>
          )}
          <View style={styles.footer}>
            {lessonType && (
              <Text variant="bodySmall" style={styles.type}>
                {LESSON_TYPE_LABELS[lessonType] ?? lessonType}
              </Text>
            )}
            <Text variant="bodySmall" style={styles.enrollment}>
              {instance.enrollment_count ?? 0}{maxStudents ? `/${maxStudents}` : ''} enrolled
            </Text>
          </View>
        </Card.Content>
      </Card>
      {canManageCoaches && (
        <Portal>
          <Dialog visible={showAddCoach} onDismiss={() => setShowAddCoach(false)}>
            <Dialog.Title>Add Coach</Dialog.Title>
            <Dialog.ScrollArea style={{ maxHeight: 350 }}>
              <ScrollView>
                {allCoaches
                  ?.filter((c) => c.id !== instance.coach_id && !additionalCoaches?.some((ac) => ac.coach_id === c.id))
                  .map((coach) => (
                    <TouchableOpacity key={coach.id} onPress={() => handleAddCoach(coach.id)}>
                      <View style={styles.coachRow}>
                        <Text variant="bodyLarge" style={styles.coachRowText}>
                          {coach.first_name} {coach.last_name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={() => setShowAddCoach(false)}>Cancel</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  virtualCard: {
    opacity: 0.7,
    borderStyle: 'dashed' as const,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateChip: {
    backgroundColor: '#E3F2FD',
    height: 26,
  },
  templateChipText: {
    fontSize: 11,
    color: COLORS.info,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  detail: {
    color: COLORS.textSecondary,
  },
  descriptionSnippet: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  type: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  enrollment: {
    color: COLORS.textSecondary,
  },
  additionalCoachesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  coachChip: {
    marginBottom: 2,
  },
  addCoachButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  coachRow: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  coachRowText: {
    color: COLORS.textPrimary,
  },
});
