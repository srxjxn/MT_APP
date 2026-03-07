import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Button, Portal, Dialog, TextInput } from 'react-native-paper';
import { useUserSubscriptions } from '@/lib/hooks/useSubscriptions';
import { useUserPayments } from '@/lib/hooks/usePayments';
import { useRecordExternalPayment, useStripePayment } from '@/lib/hooks/useStripePayments';
import { useStripeSubscription, useCancelStripeSubscription } from '@/lib/hooks/useStripeSubscription';
import { MembershipPayCard } from '@/components/billing/MembershipPayCard';
import { PaymentCard } from '@/components/payments/PaymentCard';
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import { LoadingScreen } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { Subscription } from '@/lib/types';

export default function ParentBilling() {
  const { data: subscriptions, isLoading: subsLoading, refetch: refetchSubs, isRefetching: subsRefetching } = useUserSubscriptions();
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments, isRefetching: paymentsRefetching } = useUserPayments();
  const recordExternal = useRecordExternalPayment();
  const stripePayment = useStripePayment();
  const stripeSubscription = useStripeSubscription();
  const cancelSubscription = useCancelStripeSubscription();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalAmount, setExternalAmount] = useState('');
  const [externalDescription, setExternalDescription] = useState('');

  const isLoading = subsLoading || paymentsLoading;
  const isRefetching = subsRefetching || paymentsRefetching;

  const refetch = () => {
    refetchSubs();
    refetchPayments();
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
      showSnackbar('Payment successful!', 'success');
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

  const handleSubscribe = async (sub: Subscription) => {
    const stripePriceId = (sub as any).stripe_price_id;
    if (!stripePriceId) return;
    try {
      await stripeSubscription.mutateAsync({
        subscription_id: sub.id,
        stripe_price_id: stripePriceId,
      });
      showSnackbar('Subscription activated!', 'success');
    } catch (err: any) {
      if (err.message !== 'Payment cancelled') {
        showSnackbar(err.message ?? 'Subscription failed', 'error');
      }
    }
  };

  const handleCancelSubscription = async (sub: Subscription) => {
    if (!sub.stripe_subscription_id) return;
    try {
      await cancelSubscription.mutateAsync({
        stripe_subscription_id: sub.stripe_subscription_id,
      });
      showSnackbar('Subscription will cancel at end of billing period', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to cancel subscription', 'error');
    }
  };

  const activeSubs = subscriptions?.filter((s) => s.status === 'active') ?? [];

  return (
    <View style={styles.container} testID="parent-billing">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Membership</Text>
          {activeSubs.length > 0 ? (
            activeSubs.map((sub) => (
              <MembershipPayCard
                key={sub.id}
                subscription={sub}
                onPayNow={() => handlePayNow(sub)}
                onSubscribe={() => handleSubscribe(sub)}
                onCancelSubscription={() => handleCancelSubscription(sub)}
                loading={stripeSubscription.isPending}
                cancelLoading={cancelSubscription.isPending}
                testID={`membership-card-${sub.id}`}
              />
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.emptyText}>No active memberships</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Payment History</Text>
          {payments && payments.length > 0 ? (
            payments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))
          ) : (
            <Text variant="bodyMedium" style={styles.emptyText}>No payments yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Subscription payment selector */}
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
  section: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  input: {
    marginBottom: SPACING.sm,
  },
});
