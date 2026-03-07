import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { FAB, Text, Portal, Modal, Button, SegmentedButtons, Menu, Banner } from 'react-native-paper';
import { router } from 'expo-router';
import { useLessonInstances, useGenerateInstances, useBulkCompletePastLessons, LessonInstanceWithJoins } from '@/lib/hooks/useLessonInstances';
import { useCoachUsers } from '@/lib/hooks/useStudents';
import { LessonCard } from '@/components/lessons/LessonCard';
import { DayCalendarView } from '@/components/lessons/DayCalendarView';
import { LessonTypeToggle } from '@/components/lessons/LessonTypeToggle';
import { LoadingScreen, EmptyState, DatePickerField } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';

const VIEW_MODE_BUTTONS = [
  { value: 'calendar', label: 'Calendar', icon: 'calendar' },
  { value: 'list', label: 'List', icon: 'format-list-bulleted' },
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ScheduleScreen() {
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterCoachId, setFilterCoachId] = useState('');
  const [filterLessonType, setFilterLessonType] = useState('all');
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarDate, setCalendarDate] = useState(todayStr());
  const [fabOpen, setFabOpen] = useState(false);

  const filters = {
    dateFrom: filterDateFrom || undefined,
    dateTo: filterDateTo || undefined,
    coachId: filterCoachId || undefined,
    lessonType: filterLessonType !== 'all' ? filterLessonType : undefined,
  };

  const { data: instances, isLoading, refetch, isRefetching } = useLessonInstances(filters);
  const { data: coaches } = useCoachUsers();
  const generateInstances = useGenerateInstances();
  const bulkComplete = useBulkCompletePastLessons();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showGenerate, setShowGenerate] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const selectedCoach = coaches?.find((c) => c.id === filterCoachId);
  const hasFilters = filterDateFrom || filterDateTo || filterCoachId || filterLessonType !== 'all';

  // Check for uncompleted past lessons
  const today = todayStr();
  const pastScheduledCount = instances?.filter(
    (i) => i.status === 'scheduled' && i.date < today
  ).length ?? 0;

  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterCoachId('');
    setFilterLessonType('all');
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

  const handleBulkComplete = async () => {
    try {
      const result = await bulkComplete.mutateAsync({ beforeDate: today });
      showSnackbar(`Marked ${result?.length ?? 0} past lesson(s) as completed`, 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to complete lessons', 'error');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading schedule..." testID="schedule-loading" />;
  }

  return (
    <View style={styles.container} testID="admin-schedule">
      {pastScheduledCount > 0 && (
        <Banner
          visible
          icon="clock-alert-outline"
          style={styles.warningBanner}
          actions={[
            { label: 'Mark Complete', onPress: handleBulkComplete },
          ]}
        >
          {pastScheduledCount} past lesson(s) still marked as "scheduled".
        </Banner>
      )}
      <View style={styles.filterBar}>
        <LessonTypeToggle
          value={filterLessonType}
          onValueChange={setFilterLessonType}
          style={styles.lessonTypeToggle}
        />
        <SegmentedButtons
          value={viewMode}
          onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}
          buttons={VIEW_MODE_BUTTONS}
          style={styles.viewModeToggle}
        />

        {viewMode === 'list' && (
          <>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <DatePickerField
                  value={filterDateFrom}
                  onChange={setFilterDateFrom}
                  label="From"
                  testID="filter-date-from"
                />
              </View>
              <View style={styles.filterField}>
                <DatePickerField
                  value={filterDateTo}
                  onChange={setFilterDateTo}
                  label="To"
                  testID="filter-date-to"
                />
              </View>
            </View>
          </>
        )}
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

      {viewMode === 'calendar' ? (
        <DayCalendarView
          instances={instances ?? []}
          date={calendarDate}
          onDateChange={setCalendarDate}
          onInstancePress={(inst) => router.push(`/(admin)/lessons/instance/${inst.id}`)}
        />
      ) : (
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
      )}

      <FAB.Group
        open={fabOpen}
        visible
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'calendar-plus',
            label: 'Generate Schedule',
            onPress: () => setShowGenerate(true),
          },
          {
            icon: 'plus-circle',
            label: 'Create Lesson',
            onPress: () => router.push('/(admin)/lessons/create'),
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        fabStyle={styles.fab}
        testID="schedule-fab-group"
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
            <DatePickerField
              value={dateFrom}
              onChange={setDateFrom}
              label="From Date"
              testID="generate-date-from"
            />
            <DatePickerField
              value={dateTo}
              onChange={setDateTo}
              label="To Date"
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
  warningBanner: {
    backgroundColor: COLORS.warningLight,
  },
  filterBar: {
    padding: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  lessonTypeToggle: {
    marginBottom: SPACING.sm,
  },
  viewModeToggle: {
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
