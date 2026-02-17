import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, FAB, Searchbar, Chip } from 'react-native-paper';
import { router } from 'expo-router';
import { useStudents } from '@/lib/hooks/useStudents';
import { LoadingScreen, EmptyState, StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { Student, UserProfile } from '@/lib/types';

type StudentWithParent = Student & { parent?: Pick<UserProfile, 'first_name' | 'last_name' | 'email'> };

export default function StudentsListScreen() {
  const { data: students, isLoading, refetch, isRefetching } = useStudents();
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!students) return [];
    let result = students as StudentWithParent[];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q)
      );
    }
    if (skillFilter) {
      result = result.filter((s) => s.skill_level === skillFilter);
    }
    return result;
  }, [students, search, skillFilter]);

  if (isLoading) {
    return <LoadingScreen message="Loading students..." testID="students-loading" />;
  }

  const renderStudent = ({ item }: { item: StudentWithParent }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/(admin)/students/${item.id}`)}
      testID={`student-card-${item.id}`}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.name}>
            {item.first_name} {item.last_name}
          </Text>
          <StatusBadge status={item.skill_level} />
        </View>
        {item.parent && (
          <Text variant="bodyMedium" style={styles.detail}>
            Parent: {item.parent.first_name} {item.parent.last_name}
          </Text>
        )}
        {item.date_of_birth && (
          <Text variant="bodySmall" style={styles.detail}>
            DOB: {item.date_of_birth}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container} testID="students-list">
      <Searchbar
        placeholder="Search students..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchbar}
        testID="students-search"
      />
      <View style={styles.filters}>
        {(['beginner', 'intermediate', 'advanced', 'elite'] as const).map((level) => (
          <Chip
            key={level}
            selected={skillFilter === level}
            onPress={() => setSkillFilter(skillFilter === level ? null : level)}
            style={styles.chip}
            testID={`filter-${level}`}
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </Chip>
        ))}
      </View>
      <FlatList
        data={filtered}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-group"
            title="No Students Yet"
            description="Add your first student to get started"
            actionLabel="Add Student"
            onAction={() => router.push('/(admin)/students/create')}
          />
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(admin)/students/create')}
        testID="students-add-fab"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchbar: {
    margin: SPACING.md,
    marginBottom: SPACING.xs,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  chip: {
    marginRight: SPACING.xs,
  },
  list: {
    padding: SPACING.md,
    paddingTop: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
  },
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  cardHeader: {
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
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});
