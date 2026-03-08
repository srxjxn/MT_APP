import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Text, Button, Menu } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams } from 'expo-router';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { useAssignCoach } from '@/lib/hooks/useAssignCoach';
import { LoadingScreen } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/authStore';
import { UserProfile, Student } from '@/lib/types';

function useParentDetail(id: string) {
  return useQuery({
    queryKey: ['users', 'parent-detail', id],
    queryFn: async (): Promise<
      Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email' | 'phone' | 'assigned_coach_id'> & {
        students: Pick<Student, 'id' | 'first_name' | 'last_name' | 'skill_level'>[];
      }
    > => {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone, assigned_coach_id, students(id, first_name, last_name, skill_level)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export default function ParentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: parent, isLoading } = useParentDetail(id!);
  const { data: coaches } = useCoachUsers();
  const assignCoach = useAssignCoach();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);

  if (isLoading || !parent) {
    return <LoadingScreen message="Loading parent..." />;
  }

  const selectedCoach = coaches?.find((c) => c.id === parent.assigned_coach_id);

  const handleCoachSelect = async (coachId: string | null) => {
    setCoachMenuVisible(false);
    try {
      await assignCoach.mutateAsync({ parentId: parent.id, coachId });
      showSnackbar('Coach assignment updated', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update coach', 'error');
    }
  };

  return (
    <ScrollView style={styles.container} testID="parent-detail">
      {/* Parent Info */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.infoHeader}>
            <MaterialCommunityIcons name="account" size={32} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text variant="titleLarge" style={styles.name}>
                {parent.first_name} {parent.last_name}
              </Text>
              <Text variant="bodyMedium" style={styles.detail}>{parent.email}</Text>
              {parent.phone && (
                <Text variant="bodyMedium" style={styles.detail}>{parent.phone}</Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Coach Assignment */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Assigned Coach</Text>
          <Menu
            visible={coachMenuVisible}
            onDismiss={() => setCoachMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setCoachMenuVisible(true)}
                style={styles.dropdown}
                loading={assignCoach.isPending}
                testID="coach-dropdown"
              >
                {selectedCoach
                  ? `${selectedCoach.first_name} ${selectedCoach.last_name}`
                  : 'No coach assigned'}
              </Button>
            }
          >
            <Menu.Item
              onPress={() => handleCoachSelect(null)}
              title="None"
              testID="coach-option-none"
            />
            {coaches?.map((coach) => (
              <Menu.Item
                key={coach.id}
                onPress={() => handleCoachSelect(coach.id)}
                title={`${coach.first_name} ${coach.last_name}`}
                testID={`coach-option-${coach.id}`}
              />
            ))}
          </Menu>
        </Card.Content>
      </Card>

      {/* Students */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Students</Text>
          {parent.students && parent.students.length > 0 ? (
            parent.students.map((student) => (
              <View key={student.id} style={styles.studentRow}>
                <MaterialCommunityIcons name="account-child" size={20} color={COLORS.textSecondary} />
                <Text variant="bodyMedium" style={styles.studentName}>
                  {student.first_name} {student.last_name}
                </Text>
                <Text variant="bodySmall" style={styles.skillLevel}>
                  {student.skill_level ? student.skill_level.charAt(0).toUpperCase() + student.skill_level.slice(1) : ''}
                </Text>
              </View>
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.detail}>No students</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoText: {
    flex: 1,
  },
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  detail: {
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  dropdown: {
    marginBottom: SPACING.xs,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  studentName: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  skillLevel: {
    color: COLORS.textSecondary,
  },
});
