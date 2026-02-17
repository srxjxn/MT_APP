import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Menu } from 'react-native-paper';
import { FormField, DatePickerField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { paymentSchema, PaymentFormData, PAYMENT_TYPES, PAYMENT_STATUSES, PAYMENT_PLATFORMS } from '@/lib/validation/payment';
import { UserProfile, Subscription } from '@/lib/types';

interface PaymentFormProps {
  parentUsers?: Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'>[];
  subscriptions?: Pick<Subscription, 'id' | 'name'>[];
  onSubmit: (data: PaymentFormData) => void;
  loading?: boolean;
  testID?: string;
}

export function PaymentForm({
  parentUsers,
  subscriptions,
  onSubmit,
  loading = false,
  testID,
}: PaymentFormProps) {
  const [amountDollars, setAmountDollars] = useState('');
  const [userId, setUserId] = useState('');
  const [paymentType, setPaymentType] = useState<string>('lesson');
  const [paymentStatus, setPaymentStatus] = useState<string>('completed');
  const [paymentPlatform, setPaymentPlatform] = useState<string>('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [description, setDescription] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [platformMenuVisible, setPlatformMenuVisible] = useState(false);
  const [subMenuVisible, setSubMenuVisible] = useState(false);

  const selectedUser = parentUsers?.find((u) => u.id === userId);
  const selectedSub = subscriptions?.find((s) => s.id === subscriptionId);

  const handleSubmit = () => {
    const amountCents = Math.round(parseFloat(amountDollars || '0') * 100);

    const result = paymentSchema.safeParse({
      user_id: userId,
      amount_cents: amountCents,
      payment_type: paymentType,
      payment_status: paymentStatus,
      payment_platform: paymentPlatform || undefined,
      subscription_id: subscriptionId || undefined,
      description: description || undefined,
      paid_at: paidAt || undefined,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(result.data);
  };

  return (
    <View style={styles.container} testID={testID ?? 'payment-form'}>
      {parentUsers && (
        <>
          <Text variant="titleSmall" style={styles.label}>Parent</Text>
          <Menu
            visible={userMenuVisible}
            onDismiss={() => setUserMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setUserMenuVisible(true)}
                style={styles.dropdown}
                testID="payment-user-dropdown"
              >
                {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : 'Select parent'}
              </Button>
            }
          >
            {parentUsers.map((user) => (
              <Menu.Item
                key={user.id}
                onPress={() => { setUserId(user.id); setUserMenuVisible(false); setErrors((e) => ({ ...e, user_id: '' })); }}
                title={`${user.first_name} ${user.last_name}`}
              />
            ))}
          </Menu>
          {errors.user_id && <Text variant="bodySmall" style={styles.error}>{errors.user_id}</Text>}
        </>
      )}

      <FormField
        label="Amount ($)"
        value={amountDollars}
        onChangeText={(v) => { setAmountDollars(v); setErrors((e) => ({ ...e, amount_cents: '' })); }}
        error={errors.amount_cents}
        keyboardType="numeric"
        testID="payment-amount-input"
      />

      <Text variant="titleSmall" style={styles.label}>Payment Type</Text>
      <Menu
        visible={typeMenuVisible}
        onDismiss={() => setTypeMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setTypeMenuVisible(true)} style={styles.dropdown} testID="payment-type-dropdown">
            {paymentType.charAt(0).toUpperCase() + paymentType.slice(1).replace('_', ' ')}
          </Button>
        }
      >
        {PAYMENT_TYPES.map((t) => (
          <Menu.Item key={t} onPress={() => { setPaymentType(t); setTypeMenuVisible(false); }} title={t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')} />
        ))}
      </Menu>

      <Text variant="titleSmall" style={styles.label}>Status</Text>
      <Menu
        visible={statusMenuVisible}
        onDismiss={() => setStatusMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setStatusMenuVisible(true)} style={styles.dropdown} testID="payment-status-dropdown">
            {paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1)}
          </Button>
        }
      >
        {PAYMENT_STATUSES.map((s) => (
          <Menu.Item key={s} onPress={() => { setPaymentStatus(s); setStatusMenuVisible(false); }} title={s.charAt(0).toUpperCase() + s.slice(1)} />
        ))}
      </Menu>

      <Text variant="titleSmall" style={styles.label}>Platform (optional)</Text>
      <Menu
        visible={platformMenuVisible}
        onDismiss={() => setPlatformMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setPlatformMenuVisible(true)} style={styles.dropdown} testID="payment-platform-dropdown">
            {paymentPlatform ? paymentPlatform.charAt(0).toUpperCase() + paymentPlatform.slice(1) : 'Select platform'}
          </Button>
        }
      >
        {PAYMENT_PLATFORMS.map((p) => (
          <Menu.Item key={p} onPress={() => { setPaymentPlatform(p); setPlatformMenuVisible(false); }} title={p.charAt(0).toUpperCase() + p.slice(1)} />
        ))}
      </Menu>

      {subscriptions && subscriptions.length > 0 && (
        <>
          <Text variant="titleSmall" style={styles.label}>Subscription (optional)</Text>
          <Menu
            visible={subMenuVisible}
            onDismiss={() => setSubMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setSubMenuVisible(true)} style={styles.dropdown} testID="payment-sub-dropdown">
                {selectedSub ? selectedSub.name : 'Select subscription'}
              </Button>
            }
          >
            {subscriptions.map((s) => (
              <Menu.Item key={s.id} onPress={() => { setSubscriptionId(s.id); setSubMenuVisible(false); }} title={s.name} />
            ))}
          </Menu>
        </>
      )}

      <FormField
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="payment-description-input"
      />

      <DatePickerField
        value={paidAt}
        onChange={setPaidAt}
        label="Paid Date"
        testID="payment-date-input"
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="payment-submit"
      >
        Record Payment
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  label: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
  },
  dropdown: {
    marginBottom: SPACING.xs,
  },
  error: {
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  submitContent: {
    height: LAYOUT.buttonHeight,
  },
});
