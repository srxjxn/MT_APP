import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl, SectionList } from 'react-native';
import { Card, Text, FAB, Chip, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useLessonTemplates, LessonTemplateWithJoins } from '@/lib/hooks/useLessonTemplates';
import { LoadingScreen, EmptyState, StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { DAYS_OF_WEEK, LESSON_TYPE_LABELS } from '@/lib/validation/lessonTemplate';
import { useMemo } from 'react';

export default function LessonTemplatesScreen() {
  const { data: templates, isLoading, refetch, isRefetching } = useLessonTemplates();

  const sections = useMemo(() => {
    if (!templates) return [];
    const grouped = new Map<number, LessonTemplateWithJoins[]>();
    templates.forEach((t) => {
      const existing = grouped.get(t.day_of_week) ?? [];
      existing.push(t);
      grouped.set(t.day_of_week, existing);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, data]) => ({
        title: DAYS_OF_WEEK.find((d) => d.value === day)?.label ?? `Day ${day}`,
        data,
      }));
  }, [templates]);

  if (isLoading) {
    return <LoadingScreen message="Loading templates..." testID="templates-loading" />;
  }

  const renderTemplate = ({ item }: { item: LessonTemplateWithJoins }) => (
    <Card
      style={[styles.card, !item.is_active && styles.inactiveCard]}
      onPress={() => router.push(`/(admin)/lessons/${item.id}`)}
      testID={`template-card-${item.id}`}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.name}>{item.name}</Text>
          <Chip compact style={styles.typeBadge}>
            {LESSON_TYPE_LABELS[item.lesson_type] ?? item.lesson_type}
          </Chip>
        </View>
        <Text variant="bodyMedium" style={styles.detail}>
          {item.coach ? `${item.coach.first_name} ${item.coach.last_name}` : 'No coach'}
          {item.court ? ` • ${item.court.name}` : ''}
        </Text>
        <Text variant="bodySmall" style={styles.detail}>
          {item.start_time} • {item.duration_minutes}min • {item.max_students} max • ${(item.price_cents / 100).toFixed(2)}
        </Text>
        {!item.is_active && <Text variant="bodySmall" style={styles.inactive}>Inactive</Text>}
      </Card.Content>
    </Card>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <Text variant="titleSmall" style={styles.sectionHeader}>{section.title}</Text>
  );

  return (
    <View style={styles.container} testID="templates-list">
      <View style={styles.navButtons}>
        <Button
          mode="outlined"
          onPress={() => router.push('/(admin)/lessons/schedule')}
          style={styles.navButton}
          icon="calendar"
        >
          View Schedule
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.push('/(admin)/lessons/requests')}
          style={styles.navButton}
          icon="clipboard-text"
        >
          Lesson Requests
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.push('/(admin)/lessons/coach-pricing')}
          style={styles.navButton}
          icon="currency-usd"
        >
          Coach Pricing
        </Button>
      </View>
      <SectionList
        sections={sections}
        renderItem={renderTemplate}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="school"
            title="No Lesson Templates"
            description="Create your first lesson template to get started"
            actionLabel="Create Template"
            onAction={() => router.push('/(admin)/lessons/create')}
          />
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/(admin)/lessons/create')}
        testID="templates-add-fab"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  navButtons: {
    padding: SPACING.md,
    paddingBottom: 0,
    gap: SPACING.sm,
  },
  navButton: {
  },
  list: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
  },
  sectionHeader: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    paddingVertical: SPACING.sm,
    paddingTop: SPACING.md,
  },
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  inactiveCard: {
    opacity: 0.6,
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
  typeBadge: {
    alignSelf: 'flex-start',
  },
  detail: {
    color: COLORS.textSecondary,
  },
  inactive: {
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
});
