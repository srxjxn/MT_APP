import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Menu } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { subscriptionSchema, SubscriptionFormData, SUBSCRIPTION_STATUSES } from '@/lib/validation/subscription';
import { UserProfile } from '@/lib/types';

interface SubscriptionFormProps {
  initialValues?: Partial<SubscriptionFormData>;
  parentUsers?: Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'>[];
  onSubmit: (data: SubscriptionFormData) => void;
  loading?: boolean;
  submitLabel?: string;
  testID?: string;
}

export function SubscriptionForm({
  initialValues,
  parentUsers,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  testID,
}: SubscriptionFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [priceDollars, setPriceDollars] = useState(
    initialValues?.price_cents ? (initialValues.price_cents / 100).toFixed(2) : ''
  );
  const [lessonsPerMonth, setLessonsPerMonth] = useState(
    initialValues?.lessons_per_month?.toString() ?? ''
  );
  const [userId, setUserId] = useState(initialValues?.user_id ?? '');
  const [startsAt, setStartsAt] = useState(initialValues?.starts_at ?? '');
  const [endsAt, setEndsAt] = useState(initialValues?.ends_at ?? '');
  const [status, setStatus] = useState<string>(initialValues?.status ?? 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);

  const selectedUser = parentUsers?.find((u) => u.id === userId);

  const handleSubmit = () => {
    const priceCents = Math.round(parseFloat(priceDollars || '0') * 100);
    const lessons = lessonsPerMonth ? parseInt(lessonsPerMonth, 10) : undefined;

    const result = subscriptionSchema.safeParse({
      name,
      description: description || undefined,
      price_cents: priceCents,
      lessons_per_month: lessons,
      user_id: userId,
      starts_at: startsAt,
      ends_at: endsAt || undefined,
      status,
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
    <View style={styles.container} testID={testID ?? 'subscription-form'}>
      <FormField
        label="Plan Name"
        value={name}
        onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
        error={errors.name}
        testID="sub-name-input"
      />

      <FormField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="sub-description-input"
      />

      <FormField
        label="Price ($/month)"
        value={priceDollars}
        onChangeText={(v) => { setPriceDollars(v); setErrors((e) => ({ ...e, price_cents: '' })); }}
        error={errors.price_cents}
        keyboardType="numeric"
        testID="sub-price-input"
      />

      <FormField
        label="Lessons per Month"
        value={lessonsPerMonth}
        onChangeText={setLessonsPerMonth}
        keyboardType="numeric"
        testID="sub-lessons-input"
      />

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
                testID="sub-user-dropdown"
              >
                {selectedUser
                  ? `${selectedUser.first_name} ${selectedUser.last_name}`
                  : 'Select parent'}
              </Button>
            }
          >
            {parentUsers.map((user) => (
              <Menu.Item
                key={user.id}
                onPress={() => {
                  setUserId(user.id);
                  setUserMenuVisible(false);
                  setErrors((e) => ({ ...e, user_id: '' }));
                }}
                title={`${user.first_name} ${user.last_name}`}
              />
            ))}
          </Menu>
          {errors.user_id && (
            <Text variant="bodySmall" style={styles.error}>{errors.user_id}</Text>
          )}
        </>
      )}

      <FormField
        label="Start Date (YYYY-MM-DD)"
        value={startsAt}
        onChangeText={(v) => { setStartsAt(v); setErrors((e) => ({ ...e, starts_at: '' })); }}
        error={errors.starts_at}
        testID="sub-starts-input"
      />

      <FormField
        label="End Date (YYYY-MM-DD, optional)"
        value={endsAt}
        onChangeText={setEndsAt}
        testID="sub-ends-input"
      />

      <Text variant="titleSmall" style={styles.label}>Status</Text>
      <Menu
        visible={statusMenuVisible}
        onDismiss={() => setStatusMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setStatusMenuVisible(true)}
            style={styles.dropdown}
            testID="sub-status-dropdown"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        }
      >
        {SUBSCRIPTION_STATUSES.map((s) => (
          <Menu.Item
            key={s}
            onPress={() => {
              setStatus(s);
              setStatusMenuVisible(false);
            }}
            title={s.charAt(0).toUpperCase() + s.slice(1)}
          />
        ))}
      </Menu>

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="sub-submit"
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
