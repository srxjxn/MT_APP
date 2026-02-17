import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { SegmentedButtons, Card, Text, Button, Portal, Modal, Menu, TextInput } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import {
  useAllLessonRequests,
  useUpdateLessonRequest,
  useApproveAndSchedule,
  LessonRequestWithJoins,
} from '@/lib/hooks/useLessonRequests';
import { useCourts } from '@/lib/hooks/useCourts';
import { LoadingScreen, EmptyState, StatusBadge, DatePickerField, TimePickerDropdown, DurationPicker } from '@/components/ui';
import { LessonRequestStatus } from '@/lib/types';

type FilterValue = 'all' | 'pending' | 'approved' | 'declined';

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function LessonRequestsScreen() {
  const [filter, setFilter] = useState<FilterValue>('all');
  const statusFilter = filter === 'all' ? undefined : (filter as LessonRequestStatus);
  const { data: requests, isLoading, refetch, isRefetching } = useAllLessonRequests(statusFilter);
  const updateRequest = useUpdateLessonRequest();
  const approveAndSchedule = useApproveAndSchedule();
  const { data: courts } = useCourts();

  // Approve modal state
  const [approveRequest, setApproveRequest] = useState<LessonRequestWithJoins | null>(null);
  const [approveDate, setApproveDate] = useState('');
  const [approveTime, setApproveTime] = useState('');
  const [approveDuration, setApproveDuration] = useState(60);
  const [approveCourtId, setApproveCourtId] = useState('');
  const [courtMenuVisible, setCourtMenuVisible] = useState(false);

  // Decline dialog state
  const [declineRequest, setDeclineRequest] = useState<LessonRequestWithJoins | null>(null);
  const [declineNotes, setDeclineNotes] = useState('');

  const openApprove = useCallback((req: LessonRequestWithJoins) => {
    setApproveRequest(req);
    setApproveDate(req.preferred_date);
    setApproveTime(req.preferred_time);
    setApproveDuration(60);
    setApproveCourtId('');
  }, []);

  const handleApprove = async () => {
    if (!approveRequest) return;
    try {
      await approveAndSchedule.mutateAsync({
        requestId: approveRequest.id,
        coachId: approveRequest.coach_id,
        courtId: approveCourtId || undefined,
        date: approveDate,
        startTime: approveTime,
        endTime: addMinutes(approveTime, approveDuration),
        studentId: approveRequest.student_id,
      });
      setApproveRequest(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDecline = async () => {
    if (!declineRequest) return;
    try {
      await updateRequest.mutateAsync({
        id: declineRequest.id,
        status: 'declined' as LessonRequestStatus,
        admin_notes: declineNotes || null,
      });
      setDeclineRequest(null);
      setDeclineNotes('');
    } catch {
      // Error handled by mutation
    }
  };

  const selectedCourt = courts?.find((c) => c.id === approveCourtId);

  const renderItem = useCallback(({ item }: { item: LessonRequestWithJoins }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text variant="titleSmall" style={styles.cardTitle}>
              {item.student.first_name} {item.student.last_name}
            </Text>
            <Text variant="bodySmall" style={styles.cardDetail}>
              Coach: {item.coach.first_name} {item.coach.last_name}
            </Text>
            <Text variant="bodySmall" style={styles.cardDetail}>
              Requested by: {item.requested_by_user.first_name} {item.requested_by_user.last_name}
            </Text>
            <Text variant="bodySmall" style={styles.cardDetail}>
              {formatDate(item.preferred_date)} at {formatTime(item.preferred_time)}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
        {item.admin_notes && (
          <Text variant="bodySmall" style={styles.notes}>Note: {item.admin_notes}</Text>
        )}
        {item.status === 'pending' && (
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={() => openApprove(item)}
              compact
              style={{ backgroundColor: COLORS.primary }}
            >
              Approve & Schedule
            </Button>
            <Button
              mode="outlined"
              onPress={() => { setDeclineRequest(item); setDeclineNotes(''); }}
              compact
              textColor={COLORS.error}
              style={{ borderColor: COLORS.error }}
            >
              Decline
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  ), [openApprove]);

  if (isLoading) {
    return <LoadingScreen message="Loading requests..." />;
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={(v) => setFilter(v as FilterValue)}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'declined', label: 'Declined' },
        ]}
        style={styles.segmented}
      />

      <FlatList
        data={requests ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={!requests?.length ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState icon="clipboard-text" title="No Requests" description="No lesson requests found" />
        }
      />

      {/* Approve & Schedule Modal */}
      <Portal>
        <Modal
          visible={!!approveRequest}
          onDismiss={() => setApproveRequest(null)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="titleLarge" style={styles.modalTitle}>Approve & Schedule</Text>
            {approveRequest && (
              <Text variant="bodyMedium" style={styles.modalDetail}>
                {approveRequest.student.first_name} {approveRequest.student.last_name} with{' '}
                {approveRequest.coach.first_name} {approveRequest.coach.last_name}
              </Text>
            )}

            <DatePickerField
              value={approveDate}
              onChange={setApproveDate}
              label="Date"
            />

            <TimePickerDropdown
              value={approveTime}
              onSelect={setApproveTime}
              label="Start Time"
            />

            <DurationPicker
              value={approveDuration}
              onChange={setApproveDuration}
              label="Duration"
            />

            <Text variant="titleSmall" style={styles.fieldLabel}>Court (optional)</Text>
            <Menu
              visible={courtMenuVisible}
              onDismiss={() => setCourtMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setCourtMenuVisible(true)}
                  style={styles.dropdown}
                  contentStyle={styles.dropdownContent}
                >
                  {selectedCourt ? selectedCourt.name : 'Select court'}
                </Button>
              }
            >
              <Menu.Item
                onPress={() => { setApproveCourtId(''); setCourtMenuVisible(false); }}
                title="No court"
              />
              {(courts ?? []).filter((c) => c.status === 'active').map((c) => (
                <Menu.Item
                  key={c.id}
                  onPress={() => { setApproveCourtId(c.id); setCourtMenuVisible(false); }}
                  title={c.name}
                />
              ))}
            </Menu>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setApproveRequest(null)}>Cancel</Button>
              <Button
                mode="contained"
                onPress={handleApprove}
                loading={approveAndSchedule.isPending}
                disabled={approveAndSchedule.isPending || !approveDate || !approveTime}
                style={{ backgroundColor: COLORS.primary }}
              >
                Approve
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Decline Dialog */}
      <Portal>
        <Modal
          visible={!!declineRequest}
          onDismiss={() => setDeclineRequest(null)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Decline Request</Text>
          <TextInput
            label="Admin Notes (optional)"
            value={declineNotes}
            onChangeText={setDeclineNotes}
            mode="outlined"
            multiline
            style={styles.notesInput}
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setDeclineRequest(null)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleDecline}
              loading={updateRequest.isPending}
              disabled={updateRequest.isPending}
              buttonColor={COLORS.error}
            >
              Decline
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
  segmented: {
    margin: SPACING.md,
  },
  list: {
    padding: SPACING.md,
    paddingTop: 0,
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
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  cardDetail: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notes: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 12,
    maxHeight: '90%',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  modalDetail: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
  },
  dropdown: {
    marginBottom: SPACING.xs,
  },
  dropdownContent: {
    height: LAYOUT.buttonHeight,
  },
  notesInput: {
    marginTop: SPACING.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
});
