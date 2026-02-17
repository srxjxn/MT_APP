import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { FAB, Text, Portal, Modal, Button, SegmentedButtons, Menu } from 'react-native-paper';
import { router } from 'expo-router';
import { useLessonInstances, useGenerateInstances, LessonInstanceWithJoins } from '@/lib/hooks/useLessonInstances';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { LessonCard } from '@/components/lessons/LessonCard';
import { LoadingScreen, EmptyState, FormField } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { LessonStatus } from '@/lib/types';

const STATUS_BUTTONS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ScheduleScreen() {
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCoachId, setFilterCoachId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);

  const filters = {
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
    coachId: filterCoachId || undefined,
    status: filterStatus !== 'all' ? (filterStatus as LessonStatus) : undefined,
  };

  const { data: instances, isLoading, refetch, isRefetching } = useLessonInstances(filters);
  const { data: coaches } = useCoachUsers();
  const generateInstances = useGenerateInstances();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showGenerate, setShowGenerate] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const selectedCoach = coaches?.find((c) => c.id === filterCoachId);
  const hasFilters = filterDateFrom || filterDateTo || filterCoachId || filterStatus !== 'all';

  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterCoachId('');
    setFilterStatus('all');
  };

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) {
      showSnackbar('Please enter both dates', 'error');
      return;
    }
    try {
      const result = await generateInstances.mutateAsync({ dateFrom, dateTo });
      showSnackbar(`Generated ${result.created.length} lesson instances${result.skipped.length > 0 ? `, ${result.skipped.length} skipped (coach conflicts)` : ''}`, 'success');
      setShowGenerate(false);
      setDateFrom('');
      setDateTo('');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to generate instances', 'error');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading schedule..." testID="schedule-loading" />;
  }

  return (
    <View style={styles.container} testID="admin-schedule">
      <View style={styles.filterBar}>
        <SegmentedButtons
          value={filterStatus}
          onValueChange={setFilterStatus}
          buttons={STATUS_BUTTONS}
          style={styles.statusFilter}
        />
        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <FormField
              label="From (YYYY-MM-DD)"
              value={filterDateFrom}
              onChangeText={setFilterDateFrom}
              testID="filter-date-from"
            />
          </View>
          <View style={styles.filterField}>
            <FormField
              label="To (YYYY-MM-DD)"
              value={filterDateTo}
              onChangeText={setFilterDateTo}
              testID="filter-date-to"
            />
          </View>
        </View>
        <View style={styles.filterRow}>
          <Menu
            visible={coachMenuVisible}
            onDismiss={() => setCoachMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setCoachMenuVisible(true)}
                compact
                style={styles.coachButton}
                testID="filter-coach"
              >
                {selectedCoach ? `${selectedCoach.first_name} ${selectedCoach.last_name}` : 'All Coaches'}
              </Button>
            }
          >
            <Menu.Item
              onPress={() => { setFilterCoachId(''); setCoachMenuVisible(false); }}
              title="All Coaches"
            />
            {coaches?.map((c) => (
              <Menu.Item
                key={c.id}
                onPress={() => { setFilterCoachId(c.id); setCoachMenuVisible(false); }}
                title={`${c.first_name} ${c.last_name}`}
              />
            ))}
          </Menu>
          {hasFilters && (
            <Button mode="text" onPress={clearFilters} compact testID="clear-filters">
              Clear
            </Button>
          )}
        </View>
      </View>

      <FlatList
        data={instances}
        renderItem={({ item }: { item: LessonInstanceWithJoins }) => (
          <LessonCard
            instance={item}
            onPress={() => router.push(`/(admin)/lessons/instance/${item.id}`)}
            testID={`instance-card-${item.id}`}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={instances?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-blank"
            title="No Scheduled Lessons"
            description="Generate lesson instances from your templates"
            actionLabel="Generate Schedule"
            onAction={() => setShowGenerate(true)}
          />
        }
      />
      <FAB
        icon="calendar-plus"
        style={styles.fab}
        onPress={() => setShowGenerate(true)}
        testID="generate-fab"
        label="Generate"
      />

      <Portal>
        <Modal
          visible={showGenerate}
          onDismiss={() => setShowGenerate(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Generate Schedule</Text>
          <Text variant="bodyMedium" style={styles.modalSubtitle}>
            Create lesson instances from active templates for the selected date range.
          </Text>
          <View style={styles.modalContent}>
            <FormField
              label="From Date (YYYY-MM-DD)"
              value={dateFrom}
              onChangeText={setDateFrom}
              testID="generate-date-from"
            />
            <FormField
              label="To Date (YYYY-MM-DD)"
              value={dateTo}
              onChangeText={setDateTo}
              testID="generate-date-to"
            />
            <Button
              mode="contained"
              onPress={handleGenerate}
              loading={generateInstances.isPending}
              disabled={generateInstances.isPending}
              style={styles.generateButton}
              contentStyle={styles.generateContent}
              testID="generate-submit"
            >
              Generate Instances
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterBar: {
    padding: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  statusFilter: {
    marginBottom: SPACING.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  filterField: {
    flex: 1,
  },
  coachButton: {
    flex: 0,
  },
  list: {
    padding: SPACING.md,
    paddingTop: SPACING.xs,
  },
  emptyContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: SPACING.md,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
  },
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    padding: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  modalContent: {
    padding: SPACING.md,
  },
  generateButton: {
    marginTop: SPACING.md,
  },
  generateContent: {
    height: LAYOUT.buttonHeight,
  },
});
