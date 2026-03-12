import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Button, Portal, Dialog, TextInput, Card, RadioButton, Divider, ProgressBar } from 'react-native-paper';
import { useUserSubscriptions, useCreateSelfSubscription } from '@/lib/hooks/useSubscriptions';
import { useUserPayments } from '@/lib/hooks/usePayments';
import { useRecordExternalPayment, useStripePayment } from '@/lib/hooks/useStripePayments';
import { useStripeSubscription, useCancelStripeSubscription } from '@/lib/hooks/useStripeSubscription';
import { useMembershipPlans } from '@/lib/hooks/useMembershipPlans';
import { useParentStudents, useCoachUsers } from '@/lib/hooks/useStudents';
import { useAssignCoach } from '@/lib/hooks/useAssignCoach';
import { useParentAllStudentPackages } from '@/lib/hooks/useStudentPackages';
import { MembershipPayCard } from '@/components/billing/MembershipPayCard';
import { PaymentCard } from '@/components/payments/PaymentCard';
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import { LoadingScreen } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { Subscription, MembershipPlan } from '@/lib/types';

export default function ParentBilling() {
  const { data: subscriptions, isLoading: subsLoading, refetch: refetchSubs, isRefetching: subsRefetching } = useUserSubscriptions();
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments, isRefetching: paymentsRefetching } = useUserPayments();
  const { data: packages, refetch: refetchPackages, isRefetching: packagesRefetching } = useParentAllStudentPackages();
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();
  const { data: students } = useParentStudents();
  const { data: coaches } = useCoachUsers();
  const assignCoach = useAssignCoach();
  const recordExternal = useRecordExternalPayment();
  const stripePayment = useStripePayment();
  const stripeSubscription = useStripeSubscription();
  const cancelSubscription = useCancelStripeSubscription();
  const createSelfSub = useCreateSelfSubscription();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalAmount, setExternalAmount] = useState('');
  const [externalDescription, setExternalDescription] = useState('');

  // Self-subscribe state
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [showPlanStudentPicker, setShowPlanStudentPicker] = useState(false);
  const [selectedPlanStudentId, setSelectedPlanStudentId] = useState<string>('');
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');

  const isLoading = subsLoading || paymentsLoading || plansLoading;
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

  const handlePlanSubscribe = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setSelectedCoachId('');
    const hasStudents = students && students.length > 0;
    const hasCoaches = coaches && coaches.length > 0;
    if (hasStudents || hasCoaches) {
      if (hasStudents) setSelectedPlanStudentId(students[0].id);
      setShowPlanStudentPicker(true);
    } else {
      confirmPlanSubscription(plan, undefined);
    }
  };

  const confirmPlanSubscription = async (plan: MembershipPlan, studentId?: string, coachId?: string) => {
    setShowPlanStudentPicker(false);
    try {
      // Assign coach to selected student if both are specified
      if (coachId && studentId) {
        await assignCoach.mutateAsync({ studentId, coachId });
      }

      const newSub = await createSelfSub.mutateAsync({ plan, studentId });

      if (plan.stripe_price_id) {
        // Use Stripe recurring billing
        try {
          await stripeSubscription.mutateAsync({
            subscription_id: newSub.id,
            stripe_price_id: plan.stripe_price_id,
          });
          showSnackbar('Subscription activated!', 'success');
        } catch (err: any) {
          if (err.message !== 'Payment cancelled') {
            showSnackbar(err.message ?? 'Subscription failed', 'error');
          }
        }
      } else {
        // Show payment method selector for one-time payment
        setSelectedSub(newSub);
        setShowPaymentSelector(true);
      }
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to create subscription', 'error');
    }
  };

  const activeSubs = subscriptions?.filter((s) => s.status === 'active') ?? [];
  const hasActiveSubs = activeSubs.length > 0;
  const activePackages = packages?.filter((p) => p.status === 'active') ?? [];

  return (
    <View style={styles.container} testID="parent-billing">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Membership</Text>
          {hasActiveSubs ? (
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

        {/* Available Plans — show when no active subscriptions */}
        {!hasActiveSubs && plans && plans.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Available Plans</Text>
            {plans.map((plan) => (
              <Card key={plan.id} style={styles.planCard} testID={`plan-card-${plan.id}`}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.planName}>{plan.name}</Text>
                  {plan.description && (
                    <Text variant="bodySmall" style={styles.planDescription}>{plan.description}</Text>
                  )}
                  <Text variant="headlineMedium" style={styles.planPrice}>
                    ${(plan.price_cents / 100).toFixed(2)}/4 weeks
                  </Text>
                  {plan.lessons_per_month && (
                    <Text variant="bodySmall" style={styles.planLessons}>
                      {plan.lessons_per_month} lessons per cycle
                    </Text>
                  )}
                  <Button
                    mode="contained"
                    onPress={() => handlePlanSubscribe(plan)}
                    loading={createSelfSub.isPending && selectedPlan?.id === plan.id}
                    disabled={createSelfSub.isPending}
                    style={styles.subscribeButton}
                    testID={`subscribe-plan-${plan.id}`}
                  >
                    Subscribe
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {activePackages.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Lesson Packages</Text>
            {activePackages.map((pkg) => {
              const hoursRemaining = pkg.hours_purchased - pkg.hours_used;
              const progress = pkg.hours_purchased > 0 ? pkg.hours_used / pkg.hours_purchased : 0;
              const isLow = hoursRemaining <= 1;
              const progressColor = isLow ? COLORS.warning : COLORS.success;

              return (
                <Card key={pkg.id} style={styles.packageCard} testID={`package-card-${pkg.id}`}>
                  <Card.Content>
                    <View style={styles.packageHeader}>
                      <Text variant="titleMedium" style={styles.packageName}>
                        {pkg.student.first_name} {pkg.student.last_name}
                      </Text>
                    </View>
                    <Text variant="bodySmall" style={styles.packageCoachName}>
                      Coach: {pkg.coach_package.coach.first_name} {pkg.coach_package.coach.last_name}
                    </Text>
                    <Text variant="bodySmall" style={styles.packageCoachName}>
                      {pkg.coach_package.name}
                    </Text>
                    <View style={styles.packageHoursRow}>
                      <Text variant="bodySmall" style={styles.packageHoursText}>
                        {pkg.hours_used}h used / {pkg.hours_purchased}h purchased
                      </Text>
                      <Text variant="bodySmall" style={[styles.packageHoursRemaining, { color: progressColor }]}>
                        {hoursRemaining}h remaining
                      </Text>
                    </View>
                    <ProgressBar
                      progress={progress}
                      color={progressColor}
                      style={styles.packageProgressBar}
                    />
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}

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

      {/* Student & coach picker for plan subscription */}
      <Portal>
        <Dialog
          visible={showPlanStudentPicker}
          onDismiss={() => setShowPlanStudentPicker(false)}
          testID="plan-student-picker"
        >
          <Dialog.Title>Subscribe</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <ScrollView>
              {students && students.length > 0 && (
                <>
                  <Text variant="titleSmall" style={styles.pickerLabel}>Select Student</Text>
                  <RadioButton.Group
                    value={selectedPlanStudentId}
                    onValueChange={setSelectedPlanStudentId}
                  >
                    {students.map((student) => (
                      <RadioButton.Item
                        key={student.id}
                        label={`${student.first_name} ${student.last_name}`}
                        value={student.id}
                        testID={`student-radio-${student.id}`}
                      />
                    ))}
                  </RadioButton.Group>
                </>
              )}

              {coaches && coaches.length > 0 && (
                <>
                  <Divider style={styles.pickerDivider} />
                  <Text variant="titleSmall" style={styles.pickerLabel}>Select Coach (optional)</Text>
                  <RadioButton.Group
                    value={selectedCoachId}
                    onValueChange={setSelectedCoachId}
                  >
                    <RadioButton.Item
                      label="No preference"
                      value=""
                      testID="coach-radio-none"
                    />
                    {coaches.map((coach) => (
                      <RadioButton.Item
                        key={coach.id}
                        label={`${coach.first_name} ${coach.last_name}`}
                        value={coach.id}
                        testID={`coach-radio-${coach.id}`}
                      />
                    ))}
                  </RadioButton.Group>
                </>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowPlanStudentPicker(false)}>Cancel</Button>
            <Button
              onPress={() => {
                if (selectedPlan) {
                  confirmPlanSubscription(
                    selectedPlan,
                    selectedPlanStudentId || undefined,
                    selectedCoachId || undefined,
                  );
                }
              }}
              testID="confirm-plan-subscribe"
            >
              Continue
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
  planCard: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
  },
  planName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  planDescription: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  planPrice: {
    color: COLORS.primary,
    fontWeight: '700',
    marginVertical: SPACING.sm,
  },
  planLessons: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  subscribeButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  packageCard: {
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
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
  },
  packageCoachName: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  packageHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  packageHoursText: {
    color: COLORS.textSecondary,
  },
  packageHoursRemaining: {
    fontWeight: '600',
  },
  packageProgressBar: {
    height: 6,
    borderRadius: 3,
  },
  dialogScrollArea: {
    maxHeight: 400,
    paddingHorizontal: 0,
  },
  pickerLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    paddingHorizontal: 24,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  pickerDivider: {
    marginVertical: SPACING.sm,
  },
});
