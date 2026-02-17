import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, TextInput, Button, IconButton, Divider, Portal, Modal } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import {
  useCoachDirectory,
  useUpdateCoachDropInRate,
  useCreateCoachPackage,
  useUpdateCoachPackage,
  useDeleteCoachPackage,
  CoachWithPricing,
} from '@/lib/hooks/useCoachPricing';
import { CoachPackage } from '@/lib/types';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { FormField } from '@/components/ui';

export default function CoachPricingScreen() {
  const { data: coaches, isLoading } = useCoachDirectory();
  const updateDropIn = useUpdateCoachDropInRate();
  const createPackage = useCreateCoachPackage();
  const updatePackage = useUpdateCoachPackage();
  const deletePackage = useDeleteCoachPackage();

  // Package modal state
  const [editingPackage, setEditingPackage] = useState<{
    coachId: string;
    pkg?: CoachPackage;
  } | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgHours, setPkgHours] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');

  // Drop-in editing state
  const [editingDropIn, setEditingDropIn] = useState<string | null>(null);
  const [dropInValue, setDropInValue] = useState('');

  const openPackageModal = useCallback((coachId: string, pkg?: CoachPackage) => {
    setEditingPackage({ coachId, pkg });
    setPkgName(pkg?.name ?? '');
    setPkgHours(pkg ? String(pkg.num_hours) : '');
    setPkgPrice(pkg ? String(pkg.price_cents / 100) : '');
  }, []);

  const handleSavePackage = async () => {
    if (!editingPackage) return;
    const numHours = parseInt(pkgHours, 10);
    const priceCents = Math.round(parseFloat(pkgPrice) * 100);
    if (!pkgName || isNaN(numHours) || numHours < 1 || isNaN(priceCents) || priceCents < 0) return;

    try {
      if (editingPackage.pkg) {
        await updatePackage.mutateAsync({
          id: editingPackage.pkg.id,
          name: pkgName,
          num_hours: numHours,
          price_cents: priceCents,
        });
      } else {
        await createPackage.mutateAsync({
          coach_id: editingPackage.coachId,
          name: pkgName,
          num_hours: numHours,
          price_cents: priceCents,
        });
      }
      setEditingPackage(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleSaveDropIn = async (coachId: string) => {
    const value = dropInValue.trim();
    const cents = value ? Math.round(parseFloat(value) * 100) : null;
    if (value && (isNaN(cents!) || cents! < 0)) return;

    try {
      await updateDropIn.mutateAsync({ coachId, dropInRateCents: cents });
      setEditingDropIn(null);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading coaches..." />;
  }

  if (!coaches?.length) {
    return (
      <View style={styles.container}>
        <EmptyState icon="account-star" title="No Coaches" description="No coaches found in this organization" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {coaches.map((coach) => (
        <Card key={coach.id} style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.coachName}>
              {coach.first_name} {coach.last_name}
            </Text>

            {/* Drop-in Rate */}
            <View style={styles.dropInRow}>
              <Text variant="bodyMedium" style={styles.label}>Drop-in Rate:</Text>
              {editingDropIn === coach.id ? (
                <View style={styles.dropInEdit}>
                  <TextInput
                    value={dropInValue}
                    onChangeText={setDropInValue}
                    keyboardType="numeric"
                    mode="outlined"
                    dense
                    style={styles.dropInInput}
                    left={<TextInput.Affix text="$" />}
                    right={<TextInput.Affix text="/hr" />}
                  />
                  <IconButton icon="check" size={20} onPress={() => handleSaveDropIn(coach.id)} />
                  <IconButton icon="close" size={20} onPress={() => setEditingDropIn(null)} />
                </View>
              ) : (
                <View style={styles.dropInDisplay}>
                  <Text variant="bodyMedium" style={styles.dropInText}>
                    {coach.drop_in_rate_cents ? `$${(coach.drop_in_rate_cents / 100).toFixed(0)}/hr` : 'Not set'}
                  </Text>
                  <IconButton
                    icon="pencil"
                    size={18}
                    onPress={() => {
                      setEditingDropIn(coach.id);
                      setDropInValue(coach.drop_in_rate_cents ? String(coach.drop_in_rate_cents / 100) : '');
                    }}
                  />
                </View>
              )}
            </View>

            <Divider style={styles.divider} />

            {/* Packages */}
            <Text variant="titleSmall" style={styles.packagesTitle}>Packages</Text>
            {coach.packages.length > 0 ? (
              coach.packages.map((pkg) => (
                <View key={pkg.id} style={styles.packageRow}>
                  <View style={styles.packageInfo}>
                    <Text variant="bodyMedium">{pkg.name}</Text>
                    <Text variant="bodySmall" style={styles.packageDetail}>
                      {pkg.num_hours} hrs — ${(pkg.price_cents / 100).toFixed(0)} (${(pkg.price_cents / pkg.num_hours / 100).toFixed(0)}/hr)
                    </Text>
                  </View>
                  <IconButton
                    icon="pencil"
                    size={18}
                    onPress={() => openPackageModal(coach.id, pkg)}
                  />
                  <IconButton
                    icon="delete"
                    size={18}
                    iconColor={COLORS.error}
                    onPress={() => deletePackage.mutate(pkg.id)}
                  />
                </View>
              ))
            ) : (
              <Text variant="bodySmall" style={styles.noPackages}>No packages</Text>
            )}

            <Button
              mode="outlined"
              onPress={() => openPackageModal(coach.id)}
              compact
              style={styles.addButton}
              icon="plus"
            >
              Add Package
            </Button>
          </Card.Content>
        </Card>
      ))}

      {/* Package Edit Modal */}
      <Portal>
        <Modal
          visible={!!editingPackage}
          onDismiss={() => setEditingPackage(null)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {editingPackage?.pkg ? 'Edit Package' : 'Add Package'}
          </Text>
          <FormField
            label="Package Name"
            value={pkgName}
            onChangeText={setPkgName}
          />
          <FormField
            label="Number of Hours"
            value={pkgHours}
            onChangeText={setPkgHours}
            keyboardType="numeric"
          />
          <FormField
            label="Total Price ($)"
            value={pkgPrice}
            onChangeText={setPkgPrice}
            keyboardType="numeric"
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setEditingPackage(null)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleSavePackage}
              loading={createPackage.isPending || updatePackage.isPending}
              style={{ backgroundColor: COLORS.primary }}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  coachName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  label: {
    color: COLORS.textPrimary,
  },
  dropInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  dropInDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropInText: {
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  dropInEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: SPACING.sm,
  },
  dropInInput: {
    flex: 1,
    height: 40,
  },
  divider: {
    marginVertical: SPACING.sm,
  },
  packagesTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  packageInfo: {
    flex: 1,
  },
  packageDetail: {
    color: COLORS.textSecondary,
  },
  noPackages: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: SPACING.sm,
  },
  addButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 12,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
});
