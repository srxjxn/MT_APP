import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Button, Menu, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useDashboardCoaches, DashboardCoach } from '@/lib/hooks/useDashboard';
import { useCoachWorkLog, useGeneratePayroll } from '@/lib/hooks/useCoachPayroll';
import { PayrollSummary } from '@/components/payroll/PayrollSummary';
import { WorkLogItem } from '@/components/payroll/WorkLogItem';
import { DatePickerField } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/authStore';

function getDefaultPeriod() {
  const now = new Date();
  const day = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (day <= 15) {
    const start = new Date(year, month - 1, 16);
    const end = new Date(year, month, 0);
    return { start: toDateStr(start), end: toDateStr(end) };
  }
  const start = new Date(year, month, 1);
  const end = new Date(year, month, 15);
  return { start: toDateStr(start), end: toDateStr(end) };
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function GeneratePayrollScreen() {
  const { data: coaches } = useDashboardCoaches();
  const orgId = useAuthStore((s) => s.userProfile?.org_id);
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const generatePayroll = useGeneratePayroll();

  const [selectedCoach, setSelectedCoach] = useState<DashboardCoach | null>(null);
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);
  const defaultPeriod = getDefaultPeriod();
  const [periodStart, setPeriodStart] = useState(defaultPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.end);
  const [calculated, setCalculated] = useState(false);

  const { data: coachRates } = useQuery({
    queryKey: ['coach_rates', selectedCoach?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('drop_in_rate_cents, group_rate_cents')
        .eq('id', selectedCoach!.id)
        .single();
      if (error) throw error;
      return data as { drop_in_rate_cents: number | null; group_rate_cents: number | null };
    },
    enabled: !!selectedCoach,
  });

  const { data: workLog, isLoading: workLogLoading } = useCoachWorkLog(
    calculated && selectedCoach ? selectedCoach.id : '',
    calculated ? periodStart : '',
    calculated ? periodEnd : '',
  );

  const groupRateCents = coachRates?.group_rate_cents ?? 0;
  const privateRateCents = coachRates?.drop_in_rate_cents ?? 0;

  const handleCalculate = () => {
    if (!selectedCoach) {
      showSnackbar('Select a coach first', 'error');
      return;
    }
    if (!periodStart || !periodEnd) {
      showSnackbar('Select a date range', 'error');
      return;
    }
    setCalculated(true);
  };

  const handleCreateDraft = async () => {
    if (!selectedCoach || !workLog) return;

    const totalCents = Math.round(workLog.groupHours * groupRateCents) + Math.round(workLog.privateHours * privateRateCents);

    try {
      await generatePayroll.mutateAsync({
        coach_id: selectedCoach.id,
        period_start: periodStart,
        period_end: periodEnd,
        group_hours: workLog.groupHours,
        private_hours: workLog.privateHours,
        group_rate_cents: groupRateCents,
        private_rate_cents: privateRateCents,
        total_cents: totalCents,
        status: 'draft',
      });
      showSnackbar('Draft payout created', 'success');
      router.back();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create payout', 'error');
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text variant="titleMedium" style={styles.sectionTitle}>Select Coach</Text>
      <Menu
        visible={coachMenuVisible}
        onDismiss={() => setCoachMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setCoachMenuVisible(true)}
            style={styles.dropdown}
            contentStyle={styles.dropdownContent}
          >
            {selectedCoach ? `${selectedCoach.first_name} ${selectedCoach.last_name}` : 'Choose Coach'}
          </Button>
        }
      >
        {coaches?.map((c) => (
          <Menu.Item
            key={c.id}
            onPress={() => {
              setSelectedCoach(c);
              setCoachMenuVisible(false);
              setCalculated(false);
            }}
            title={`${c.first_name} ${c.last_name}`}
          />
        ))}
      </Menu>

      <DatePickerField
        label="Period Start"
        value={periodStart}
        onChange={(v) => { setPeriodStart(v); setCalculated(false); }}
        testID="period-start"
      />

      <DatePickerField
        label="Period End"
        value={periodEnd}
        onChange={(v) => { setPeriodEnd(v); setCalculated(false); }}
        testID="period-end"
      />

      <Button
        mode="contained"
        onPress={handleCalculate}
        style={styles.calculateButton}
        contentStyle={styles.buttonContent}
        loading={workLogLoading}
        disabled={!selectedCoach}
        testID="calculate-button"
      >
        Calculate Hours
      </Button>

      {calculated && workLog && (
        <View style={styles.results}>
          <PayrollSummary
            groupHours={workLog.groupHours}
            privateHours={workLog.privateHours}
            groupRateCents={groupRateCents}
            privateRateCents={privateRateCents}
            testID="payroll-summary"
          />

          {workLog.instances.length > 0 && (
            <>
              <Text variant="titleSmall" style={styles.workLogTitle}>
                Lessons Worked ({workLog.instances.length})
              </Text>
              {workLog.instances.map((inst) => (
                <WorkLogItem key={inst.id} instance={inst} />
              ))}
            </>
          )}

          {workLog.instances.length === 0 && (
            <Text variant="bodyMedium" style={styles.noLessons}>
              No completed lessons found for this period.
            </Text>
          )}

          <Button
            mode="contained"
            onPress={handleCreateDraft}
            style={styles.createButton}
            contentStyle={styles.buttonContent}
            loading={generatePayroll.isPending}
            testID="create-draft-button"
          >
            Create Draft Payout
          </Button>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  dropdown: {
    marginBottom: SPACING.sm,
  },
  dropdownContent: {
    height: LAYOUT.buttonHeight,
  },
  calculateButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  buttonContent: {
    height: LAYOUT.buttonHeight,
  },
  results: {
    marginTop: SPACING.lg,
  },
  workLogTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  noLessons: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.md,
  },
  createButton: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
    backgroundColor: COLORS.primary,
  },
});
