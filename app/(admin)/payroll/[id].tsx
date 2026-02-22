import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useCoachPayout, useCoachWorkLog, useUpdatePayrollStatus, useDeletePayout } from '@/lib/hooks/useCoachPayroll';
import { PayrollSummary } from '@/components/payroll/PayrollSummary';
import { WorkLogItem } from '@/components/payroll/WorkLogItem';
import { LoadingScreen, StatusBadge, ConfirmDialog } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';

export default function PayoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: payout, isLoading } = useCoachPayout(id!);
  const updateStatus = useUpdatePayrollStatus();
  const deletePayout = useDeletePayout();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: workLog } = useCoachWorkLog(
    payout?.coach_id ?? '',
    payout?.period_start ?? '',
    payout?.period_end ?? '',
  );

  if (isLoading || !payout) {
    return <LoadingScreen message="Loading payout..." />;
  }

  const coachName = `${payout.coach.first_name} ${payout.coach.last_name}`;

  const handleApprove = async () => {
    try {
      await updateStatus.mutateAsync({ id: payout.id, status: 'approved' });
      showSnackbar('Payout approved', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to approve', 'error');
    }
  };

  const handleMarkPaid = async () => {
    try {
      await updateStatus.mutateAsync({ id: payout.id, status: 'paid', paid_at: new Date().toISOString() });
      showSnackbar('Payout marked as paid', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to mark paid', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePayout.mutateAsync(payout.id);
      showSnackbar('Payout deleted', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete', 'error');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>{coachName}</Text>
            <StatusBadge status={payout.status} />
          </View>

          <Text variant="bodyMedium" style={styles.info}>
            Period: {payout.period_start} — {payout.period_end}
          </Text>

          {payout.paid_at && (
            <Text variant="bodySmall" style={styles.info}>
              Paid: {new Date(payout.paid_at).toLocaleDateString()}
            </Text>
          )}

          {payout.notes && (
            <Text variant="bodySmall" style={styles.notes}>Notes: {payout.notes}</Text>
          )}
        </Card.Content>
      </Card>

      <View style={styles.summarySection}>
        <PayrollSummary
          groupHours={Number(payout.group_hours)}
          privateHours={Number(payout.private_hours)}
          groupRateCents={payout.group_rate_cents}
          privateRateCents={payout.private_rate_cents}
          testID="payout-summary"
        />
      </View>

      {payout.status === 'draft' && (
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleApprove}
            loading={updateStatus.isPending}
            style={styles.approveButton}
            contentStyle={styles.buttonContent}
            testID="approve-button"
          >
            Approve
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowDeleteDialog(true)}
            textColor={COLORS.error}
            style={styles.deleteButton}
            contentStyle={styles.buttonContent}
            testID="delete-button"
          >
            Delete Draft
          </Button>
        </View>
      )}

      {payout.status === 'approved' && (
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handleMarkPaid}
            loading={updateStatus.isPending}
            style={styles.paidButton}
            contentStyle={styles.buttonContent}
            testID="mark-paid-button"
          >
            Mark as Paid
          </Button>
        </View>
      )}

      {workLog && workLog.instances.length > 0 && (
        <View style={styles.workLogSection}>
          <Text variant="titleMedium" style={styles.workLogTitle}>
            Lessons Worked ({workLog.instances.length})
          </Text>
          {workLog.instances.map((inst) => (
            <WorkLogItem key={inst.id} instance={inst} />
          ))}
        </View>
      )}

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Payout"
        message="Are you sure you want to delete this draft payout? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setShowDeleteDialog(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteDialog(false)}
        testID="delete-payout-dialog"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  infoCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  info: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  notes: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },
  summarySection: {
    paddingHorizontal: SPACING.md,
  },
  actions: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  paidButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    borderColor: COLORS.error,
  },
  buttonContent: {
    height: LAYOUT.buttonHeight,
  },
  workLogSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  workLogTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
});
