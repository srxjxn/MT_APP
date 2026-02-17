import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Switch, SegmentedButtons, Menu } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { courtSchema, CourtFormData, SURFACE_TYPES, COURT_STATUSES } from '@/lib/validation/court';

interface CourtFormProps {
  initialValues?: Partial<CourtFormData>;
  onSubmit: (data: CourtFormData) => void;
  loading?: boolean;
  submitLabel?: string;
  testID?: string;
}

export function CourtForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  testID,
}: CourtFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [surfaceType, setSurfaceType] = useState(initialValues?.surface_type ?? '');
  const [isIndoor, setIsIndoor] = useState(initialValues?.is_indoor ?? false);
  const [status, setStatus] = useState<string>(initialValues?.status ?? 'active');
  const [notes, setNotes] = useState(initialValues?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [menuVisible, setMenuVisible] = useState(false);

  const handleSubmit = () => {
    const result = courtSchema.safeParse({
      name,
      surface_type: surfaceType,
      is_indoor: isIndoor,
      status,
      notes: notes || undefined,
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
    <View style={styles.container} testID={testID ?? 'court-form'}>
      <FormField
        label="Court Name"
        value={name}
        onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: '' })); }}
        error={errors.name}
        testID="court-name-input"
      />

      <Text variant="titleSmall" style={styles.label}>Surface Type</Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setMenuVisible(true)}
            style={styles.dropdown}
            contentStyle={styles.dropdownContent}
            testID="court-surface-dropdown"
          >
            {surfaceType || 'Select surface type'}
          </Button>
        }
      >
        {SURFACE_TYPES.map((type) => (
          <Menu.Item
            key={type}
            onPress={() => {
              setSurfaceType(type);
              setMenuVisible(false);
              setErrors((e) => ({ ...e, surface_type: '' }));
            }}
            title={type}
          />
        ))}
      </Menu>
      {errors.surface_type && (
        <Text variant="bodySmall" style={styles.error}>{errors.surface_type}</Text>
      )}

      <View style={styles.switchRow}>
        <Text variant="titleSmall" style={styles.switchLabel}>Indoor Court</Text>
        <Switch
          value={isIndoor}
          onValueChange={setIsIndoor}
          color={COLORS.primary}
          testID="court-indoor-switch"
        />
      </View>

      <Text variant="titleSmall" style={styles.label}>Status</Text>
      <SegmentedButtons
        value={status}
        onValueChange={setStatus}
        buttons={COURT_STATUSES.map((s) => ({
          value: s,
          label: s.charAt(0).toUpperCase() + s.slice(1),
        }))}
        style={styles.segmented}
      />

      <FormField
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        testID="court-notes-input"
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="court-submit"
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
  dropdownContent: {
    height: LAYOUT.buttonHeight,
  },
  error: {
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 48,
  },
  switchLabel: {
    color: COLORS.textPrimary,
  },
  segmented: {
    marginBottom: SPACING.md,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  submitContent: {
    height: LAYOUT.buttonHeight,
  },
});
