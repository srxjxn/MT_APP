import React, { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Button, Text } from 'react-native-paper';
import { useParentStudents } from '@/lib/hooks/useStudents';
import { useEnrollOrWaitlist, useEnrollWithPayment, checkStudentSubscription } from '@/lib/hooks/useEnrollments';
import { useStripeCheckoutPayment, useRecordExternalPayment } from '@/lib/hooks/useStripePayments';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import { SelectableRow } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';

interface EnrollChildDialogProps {
  visible: boolean;
  lessonInstanceId: string;
  maxStudents?: number;
  enrollmentCount?: number;
  priceCents?: number | null;
  onDismiss: () => void;
  testID?: string;
}

export function EnrollChildDialog({ visible, lessonInstanceId, maxStudents, enrollmentCount, priceCents, onDismiss, testID }: EnrollChildDialogProps) {
  const { data: children } = useParentStudents();
  const enrollOrWaitlist = useEnrollOrWaitlist();
  const enrollWithPayment = useEnrollWithPayment();
  const checkoutPayment = useStripeCheckoutPayment();
  const recordExternal = useRecordExternalPayment();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const userId = useAuthStore((s) => s.userProfile?.id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<'select' | 'payment'>('select');
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

  const isFull = maxStudents != null && (enrollmentCount ?? 0) >= maxStudents;
  const hasPrice = priceCents != null && priceCents > 0;
  const priceDisplay = hasPrice ? `$${(priceCents! / 100).toFixed(2)}` : '';

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
      setStep('select');
      setShowPaymentSelector(false);
    }
  }, [visible]);

  const toggleChild = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = async () => {
    if (!hasPrice || !userId) {
      // No price set or free lesson — enroll directly
      await handleFreeEnroll();
      return;
    }

    // Check if parent has an active subscription
    setCheckingSubscription(true);
    try {
      const hasSubscription = await checkStudentSubscription(userId, [...selectedIds][0]);
      if (hasSubscription) {
        // Subscriber — enroll free
        await handleFreeEnroll();
      } else {
        // Non-subscriber — show payment step
        setStep('payment');
      }
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to check subscription', 'error');
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleFreeEnroll = async () => {
    try {
      let waitlistedCount = 0;
      let enrolledCount = 0;
      for (const studentId of selectedIds) {
        const result = await enrollOrWaitlist.mutateAsync({ lessonInstanceId, studentId });
        if (result.wasWaitlisted) {
          waitlistedCount++;
        } else {
          enrolledCount++;
        }
      }
      if (waitlistedCount > 0 && enrolledCount > 0) {
        showSnackbar(`Enrolled ${enrolledCount}, waitlisted ${waitlistedCount}`, 'success');
      } else if (waitlistedCount > 0) {
        showSnackbar(`Added ${waitlistedCount} to waitlist`, 'success');
      } else {
        showSnackbar(`Enrolled ${enrolledCount} child${enrolledCount > 1 ? 'ren' : ''}`, 'success');
      }
      setSelectedIds(new Set());
      onDismiss();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to enroll', 'error');
    }
  };

  const handleStripePayment = async () => {
    setShowPaymentSelector(false);
    try {
      const totalCents = priceCents! * selectedIds.size;
      const result = await checkoutPayment.mutateAsync({
        amount_cents: totalCents,
        payment_type: 'lesson',
        description: `Group lesson enrollment (${selectedIds.size} child${selectedIds.size > 1 ? 'ren' : ''})`,
        post_action: {
          type: 'enroll',
          lesson_instance_id: lessonInstanceId,
          student_ids: [...selectedIds],
        },
      });

      if (result?.redirected) {
        showSnackbar('Complete payment in your browser. Children will be enrolled automatically.', 'success');
      }
      setSelectedIds(new Set());
      onDismiss();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Payment failed', 'error');
    }
  };

  const handleExternalPayment = async () => {
    setShowPaymentSelector(false);
    try {
      const totalCents = priceCents! * selectedIds.size;
      const payment = await recordExternal.mutateAsync({
        amount_cents: totalCents,
        payment_type: 'lesson',
        payment_platform: 'cash',
        description: `Group lesson enrollment (${selectedIds.size} child${selectedIds.size > 1 ? 'ren' : ''})`,
      });

      // Enroll all selected children
      for (const studentId of selectedIds) {
        await enrollWithPayment.mutateAsync({
          lessonInstanceId,
          studentId,
          paymentId: payment.id,
        });
      }
      showSnackbar('Payment recorded! Children enrolled.', 'success');
      setSelectedIds(new Set());
      onDismiss();
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to record payment', 'error');
    }
  };

  const isProcessing = enrollOrWaitlist.isPending || enrollWithPayment.isPending || checkoutPayment.isPending || recordExternal.isPending || checkingSubscription;

  return (
    <>
      <Portal>
        <Dialog visible={visible && !showPaymentSelector} onDismiss={onDismiss} testID={testID ?? 'enroll-child-dialog'}>
          {step === 'select' ? (
            <>
              <Dialog.Title>{isFull ? 'Join Waitlist' : 'Enroll Child'}</Dialog.Title>
              <Dialog.Content>
                {isFull && (
                  <Text variant="bodyMedium" style={styles.waitlistWarning}>
                    This lesson is full — your child will be waitlisted
                  </Text>
                )}
                {!children?.length ? (
                  <Text variant="bodyMedium">No children to enroll</Text>
                ) : (
                  children.map((child) => (
                    <SelectableRow
                      key={child.id}
                      label={`${child.first_name} ${child.last_name}`}
                      selected={selectedIds.has(child.id)}
                      onPress={() => toggleChild(child.id)}
                      testID={`child-select-${child.id}`}
                    />
                  ))
                )}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={onDismiss}>Cancel</Button>
                <Button
                  onPress={handleNext}
                  disabled={selectedIds.size === 0}
                  loading={isProcessing}
                >
                  {isFull ? 'Join Waitlist' : 'Enroll'}
                </Button>
              </Dialog.Actions>
            </>
          ) : (
            <>
              <Dialog.Title>Payment Required</Dialog.Title>
              <Dialog.Content>
                <Text variant="bodyMedium" style={styles.paymentInfo}>
                  This lesson costs {priceDisplay} per child.
                </Text>
                <Text variant="bodyMedium" style={styles.paymentTotal}>
                  Total: ${((priceCents! * selectedIds.size) / 100).toFixed(2)} for {selectedIds.size} child{selectedIds.size > 1 ? 'ren' : ''}
                </Text>
                <Text variant="bodySmall" style={styles.paymentHint}>
                  Active subscribers enroll for free.
                </Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setStep('select')}>Back</Button>
                <Button
                  mode="contained"
                  onPress={() => setShowPaymentSelector(true)}
                  loading={isProcessing}
                  style={styles.payButton}
                >
                  Pay Now
                </Button>
              </Dialog.Actions>
            </>
          )}
        </Dialog>
      </Portal>

      <PaymentMethodSelector
        visible={showPaymentSelector}
        onDismiss={() => setShowPaymentSelector(false)}
        onSelectStripe={handleStripePayment}
        onSelectExternal={handleExternalPayment}
      />
    </>
  );
}

const styles = StyleSheet.create({
  waitlistWarning: {
    color: COLORS.warning,
    marginBottom: SPACING.sm,
    fontStyle: 'italic',
  },
  paymentInfo: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  paymentTotal: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    marginBottom: SPACING.sm,
  },
  paymentHint: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  payButton: {
    backgroundColor: COLORS.primary,
  },
});
