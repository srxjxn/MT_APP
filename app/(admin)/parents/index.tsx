import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Searchbar } from 'react-native-paper';
import { router } from 'expo-router';
import { useParentsWithCoach, ParentWithCoach } from '@/lib/hooks/useStudents';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';

export default function ParentsListScreen() {
  const { data: parents, isLoading, refetch, isRefetching } = useParentsWithCoach();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!parents) return [];
    if (!search) return parents;
    const q = search.toLowerCase();
    return parents.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }, [parents, search]);

  if (isLoading) {
    return <LoadingScreen message="Loading parents..." testID="parents-loading" />;
  }

  const renderParent = ({ item }: { item: ParentWithCoach }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/(admin)/parents/${item.id}`)}
      testID={`parent-card-${item.id}`}
    >
      <Card.Content>
        <Text variant="titleMedium" style={styles.name}>
          {item.first_name} {item.last_name}
        </Text>
        <Text variant="bodyMedium" style={styles.detail}>{item.email}</Text>
        {item.phone && (
          <Text variant="bodySmall" style={styles.detail}>{item.phone}</Text>
        )}
        <Text variant="bodySmall" style={styles.coachText}>
          Coach: {item.assigned_coach
            ? `${item.assigned_coach.first_name} ${item.assigned_coach.last_name}`
            : 'No coach assigned'}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container} testID="parents-list">
      <Searchbar
        placeholder="Search parents..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchbar}
        testID="parents-search"
      />
      <FlatList
        data={filtered}
        renderItem={renderParent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-supervisor"
            title="No Parents Found"
            description={search ? 'Try a different search term' : 'No parents in the organization yet'}
          />
        }
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
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  detail: {
    color: COLORS.textSecondary,
  },
  coachText: {
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontWeight: '500',
  },
});
