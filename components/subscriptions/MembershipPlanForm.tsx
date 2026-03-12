import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Switch, Text } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { MembershipPlan } from '@/lib/types';

interface MembershipPlanFormProps {
  initialValues?: Partial<MembershipPlan>;
  onSubmit: (data: {
    name: string;
    description?: string;
    price_cents: number;
    lessons_per_month?: number;
    stripe_price_id?: string;
    is_active: boolean;
  }) => void;
  loading?: boolean;
  submitLabel?: string;
  testID?: string;
}

export function MembershipPlanForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  testID,
}: MembershipPlanFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [priceDollars, setPriceDollars] = useState(
    initialValues?.price_cents ? (initialValues.price_cents / 100).toFixed(2) : ''
  );
  const [lessonsPerMonth, setLessonsPerMonth] = useState(
    initialValues?.lessons_per_month?.toString() ?? ''
  );
  const [stripePriceId, setStripePriceId] = useState(initialValues?.stripe_price_id ?? '');
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    const priceCents = Math.round(parseFloat(priceDollars || '0') * 100);
    if (priceCents <= 0) newErrors.price_cents = 'Price must be greater than 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const lessons = lessonsPerMonth ? parseInt(lessonsPerMonth, 10) : undefined;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      price_cents: priceCents,
      lessons_per_month: lessons,
      stripe_price_id: stripePriceId.trim() || undefined,
      is_active: isActive,
    });
  };

  return (
    <View style={styles.container} testID={testID ?? 'membership-plan-form'}>
      <FormField
        label="Plan Name"
        value={name}
        onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
        error={errors.name}
        testID="plan-name-input"
      />

      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="plan-description-input"
      />

      <FormField
        label="Price ($/4 weeks)"
        value={priceDollars}
        onChangeText={(v) => { setPriceDollars(v); setErrors((e) => ({ ...e, price_cents: '' })); }}
        error={errors.price_cents}
        keyboardType="numeric"
        testID="plan-price-input"
      />

      <FormField
        label="Lessons per Cycle (optional)"
        value={lessonsPerMonth}
        onChangeText={setLessonsPerMonth}
        keyboardType="numeric"
        testID="plan-lessons-input"
      />

      <FormField
        label="Stripe Price ID (optional)"
        value={stripePriceId}
        onChangeText={setStripePriceId}
        testID="plan-stripe-price-input"
      />

      <View style={styles.switchRow}>
        <Text variant="titleSmall" style={styles.switchLabel}>Active</Text>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          color={COLORS.primary}
          testID="plan-active-switch"
        />
      </View>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="plan-submit"
      >
        {submitLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  switchLabel: {
    color: COLORS.textPrimary,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  submitContent: {
    height: LAYOUT.buttonHeight,
  },
});
