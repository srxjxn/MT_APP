import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, SegmentedButtons, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { useUserSubscriptions } from '@/lib/hooks/useSubscriptions';
import { useUserPayments } from '@/lib/hooks/usePayments';
import { useParentAllStudentPackages, StudentPackageWithDetails } from '@/lib/hooks/useStudentPackages';
import { useRecordExternalPayment, useStripePayment } from '@/lib/hooks/useStripePayments';
import { MembershipPayCard } from '@/components/billing/MembershipPayCard';
import { PaymentCard } from '@/components/payments/PaymentCard';
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import { LoadingScreen, StatusBadge } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { Subscription } from '@/lib/types';
import { Card, ProgressBar } from 'react-native-paper';

type BillingTab = 'membership' | 'packages' | 'payments';

function PackageCard({ pkg }: { pkg: StudentPackageWithDetails }) {
  const coachName = `${pkg.coach_package.coach.first_name} ${pkg.coach_package.coach.last_name}`;
  const hoursRemaining = pkg.hours_purchased - pkg.hours_used;
  const progress = pkg.hours_purchased > 0 ? pkg.hours_used / pkg.hours_purchased : 0;
  const progressColor = hoursRemaining <= 1 ? COLORS.warning : COLORS.primary;

  return (
    <Card style={styles.packageCard}>
      <Card.Content>
        <View style={styles.packageHeader}>
          <Text variant="titleSmall" style={styles.packageName}>{pkg.coach_package.name}</Text>
          <StatusBadge status={pkg.status} />
        </View>
        <Text variant="bodySmall" style={styles.packageCoach}>Coach: {coachName}</Text>
        <View style={styles.hoursRow}>
          <Text variant="bodySmall" style={styles.hoursLabel}>
            {pkg.hours_used}h / {pkg.hours_purchased}h used
          </Text>
          <Text variant="bodySmall" style={[styles.hoursRemaining, hoursRemaining <= 1 && styles.lowHours]}>
            {hoursRemaining}h left
          </Text>
        </View>
        <ProgressBar progress={Math.min(progress, 1)} color={progressColor} style={styles.progressBar} />
      </Card.Content>
    </Card>
  );
}

export default function ParentBilling() {
  const { data: subscriptions, isLoading: subsLoading, refetch: refetchSubs, isRefetching: subsRefetching } = useUserSubscriptions();
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments, isRefetching: paymentsRefetching } = useUserPayments();
  const { data: packages, isLoading: packagesLoading, refetch: refetchPackages, isRefetching: packagesRefetching } = useParentAllStudentPackages();
  const recordExternal = useRecordExternalPayment();
  const stripePayment = useStripePayment();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [tab, setTab] = useState<BillingTab>('membership');
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalAmount, setExternalAmount] = useState('');
  const [externalDescription, setExternalDescription] = useState('');

  const isLoading = subsLoading || paymentsLoading || packagesLoading;
  const isRefetching = subsRefetching || paymentsRefetching || packagesRefetching;

  const refetch = () => {
    refetchSubs();
    refetchPayments();
    refetchPackages();
  };

  if (isLoading) {
    return <LoadingScreen message="Loading billing..." testID="billing-loading" />;
  }

  const handlePayNow = (sub: Subscription) => {
    setSelectedSub(sub);
    setShowPaymentSelector(true);
  };

  const handleStripePayment = async () => {
    if (!selectedSub) return;
    setShowPaymentSelector(false);
    try {
      await stripePayment.mutateAsync({
        amount_cents: selectedSub.price_cents,
        payment_type: 'subscription',
        subscription_id: selectedSub.id,
        description: `Payment for ${selectedSub.name}`,
      });
      showSnackbar('Stripe payment initiated (pending configuration)', 'info');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Payment failed', 'error');
    }
  };

  const handleExternalPayment = async () => {
    const amount = Math.round(parseFloat(externalAmount || '0') * 100);
    if (amount <= 0) {
      showSnackbar('Enter a valid amount', 'error');
      return;
    }
    try {
      await recordExternal.mutateAsync({
        amount_cents: amount,
        payment_type: 'subscription',
        payment_platform: 'cash',
        subscription_id: selectedSub?.id,
        description: externalDescription || undefined,
      });
      showSnackbar('Payment recorded', 'success');
      setShowExternalForm(false);
      setExternalAmount('');
      setExternalDescription('');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to record payment', 'error');
    }
  };

  const activeSubs = subscriptions?.filter((s) => s.status === 'active') ?? [];

  return (
    <View style={styles.container} testID="parent-billing">
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as BillingTab)}
        buttons={[
          { value: 'membership', label: 'Membership' },
          { value: 'packages', label: 'Packages' },
          { value: 'payments', label: 'Payments' },
        ]}
        style={styles.tabs}
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        {tab === 'membership' && (
          <View style={styles.section}>
            {activeSubs.length > 0 ? (
              activeSubs.map((sub) => (
                <MembershipPayCard
                  key={sub.id}
                  subscription={sub}
                  onPayNow={() => handlePayNow(sub)}
                  testID={`membership-card-${sub.id}`}
                />
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>No active memberships</Text>
            )}
          </View>
        )}

        {tab === 'packages' && (
          <View style={styles.section}>
            {packages && packages.length > 0 ? (
              packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>No lesson packages</Text>
            )}
          </View>
        )}

        {tab === 'payments' && (
          <View style={styles.section}>
            {payments && payments.length > 0 ? (
              payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>No payments yet</Text>
            )}
          </View>
        )}
      </ScrollView>

      <PaymentMethodSelector
        visible={showPaymentSelector}
        onDismiss={() => setShowPaymentSelector(false)}
        onSelectStripe={handleStripePayment}
        onSelectExternal={() => {
          setShowPaymentSelector(false);
          setExternalAmount(selectedSub ? (selectedSub.price_cents / 100).toFixed(2) : '');
          setShowExternalForm(true);
        }}
        testID="payment-method-selector"
      />

      <Portal>
        <Dialog visible={showExternalForm} onDismiss={() => setShowExternalForm(false)}>
          <Dialog.Title>Record External Payment</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Amount ($)"
              value={externalAmount}
              onChangeText={setExternalAmount}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
              testID="external-amount-input"
            />
            <TextInput
              label="Description (optional)"
              value={externalDescription}
              onChangeText={setExternalDescription}
              mode="outlined"
              style={styles.input}
              testID="external-description-input"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowExternalForm(false)}>Cancel</Button>
            <Button
              onPress={handleExternalPayment}
              loading={recordExternal.isPending}
              testID="record-payment-button"
            >
              Record Payment
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabs: {
    margin: SPACING.md,
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  packageCard: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  packageName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  packageCoach: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  hoursLabel: {
    color: COLORS.textSecondary,
  },
  hoursRemaining: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  lowHours: {
    color: COLORS.warning,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  input: {
    marginBottom: SPACING.sm,
  },
});
