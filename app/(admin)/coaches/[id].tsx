import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet, TextInput as RNTextInput } from 'react-native';
import {
  Card,
  Text,
  Chip,
  Button,
  IconButton,
  Divider,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { LoadingScreen } from '@/components/ui';
import { StatusBadge } from '@/components/ui';
import {
  useCoachDetail,
  useCoachDirectory,
  useUpdateCoachDropInRate,
  useCreateCoachPackage,
  useUpdateCoachPackage,
  useDeleteCoachPackage,
  coachPricingKeys,
} from '@/lib/hooks/useCoachPricing';
import { useCoachPayouts } from '@/lib/hooks/useCoachPayroll';
import { useLessonInstances } from '@/lib/hooks/useLessonInstances';
import { useUIStore } from '@/lib/stores/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { CoachPackage } from '@/lib/types';
import { COLORS, SPACING } from '@/constants/theme';

function formatCents(cents: number | null): string {
  if (cents == null) return 'Not set';
  return `$${(cents / 100).toFixed(2)}/hr`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CoachDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: coach, isLoading } = useCoachDetail(id!);
  const { data: directory } = useCoachDirectory();
  const { data: payouts } = useCoachPayouts();
  const queryClient = useQueryClient();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  // Lesson stats
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const { data: upcomingLessons } = useLessonInstances({
    coachId: id,
    dateFrom: today,
    status: 'scheduled',
  });
  const { data: completedLessons } = useLessonInstances({
    coachId: id,
    dateFrom: monthStartStr,
    dateTo: today,
    status: 'completed',
  });

  // Rate editing state
  const [editingDropIn, setEditingDropIn] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [dropInInput, setDropInInput] = useState('');
  const [groupInput, setGroupInput] = useState('');
  const updateRate = useUpdateCoachDropInRate();

  // Package state
  const [packageModalVisible, setPackageModalVisible] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CoachPackage | null>(null);
  const [pkgName, setPkgName] = useState('');
  const [pkgHours, setPkgHours] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');
  const createPackage = useCreateCoachPackage();
  const updatePackage = useUpdateCoachPackage();
  const deletePackage = useDeleteCoachPackage();

  // Derived data
  const coachPackages = useMemo(() => {
    if (!directory || !id) return [];
    const found = directory.find((c) => c.id === id);
    return found?.packages ?? [];
  }, [directory, id]);

  const coachPayouts = useMemo(() => {
    if (!payouts || !id) return [];
    return payouts.filter((p) => p.coach_id === id);
  }, [payouts, id]);

  const recentPayouts = coachPayouts.slice(0, 5);

  if (isLoading) {
    return <LoadingScreen message="Loading coach..." testID="coach-detail-loading" />;
  }

  if (!coach) {
    return (
      <View style={styles.centered}>
        <Text variant="bodyLarge" style={{ color: COLORS.textSecondary }}>Coach not found</Text>
      </View>
    );
  }

  const initials = `${coach.first_name?.[0] ?? ''}${coach.last_name?.[0] ?? ''}`.toUpperCase();

  // Rate edit handlers
  const handleStartEditDropIn = () => {
    setDropInInput(coach.drop_in_rate_cents != null ? (coach.drop_in_rate_cents / 100).toString() : '');
    setEditingDropIn(true);
  };

  const handleSaveDropIn = async () => {
    const cents = Math.round(parseFloat(dropInInput) * 100);
    if (isNaN(cents) || cents < 0) {
      showSnackbar('Enter a valid rate', 'error');
      return;
    }
    try {
      await updateRate.mutateAsync({ coachId: id!, dropInRateCents: cents });
      queryClient.invalidateQueries({ queryKey: coachPricingKeys.detail(id!) });
      showSnackbar('Drop-in rate updated', 'success');
      setEditingDropIn(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update rate', 'error');
    }
  };

  const handleStartEditGroup = () => {
    setGroupInput(coach.group_rate_cents != null ? (coach.group_rate_cents / 100).toString() : '');
    setEditingGroup(true);
  };

  const handleSaveGroup = async () => {
    const cents = Math.round(parseFloat(groupInput) * 100);
    if (isNaN(cents) || cents < 0) {
      showSnackbar('Enter a valid rate', 'error');
      return;
    }
    try {
      // Group rate is on users table too - reuse the same pattern
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('users')
        .update({ group_rate_cents: cents })
        .eq('id', id!);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: coachPricingKeys.all });
      showSnackbar('Group rate updated', 'success');
      setEditingGroup(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update rate', 'error');
    }
  };

  // Package handlers
  const openAddPackage = () => {
    setEditingPackage(null);
    setPkgName('');
    setPkgHours('');
    setPkgPrice('');
    setPackageModalVisible(true);
  };

  const openEditPackage = (pkg: CoachPackage) => {
    setEditingPackage(pkg);
    setPkgName(pkg.name);
    setPkgHours(pkg.num_hours.toString());
    setPkgPrice((pkg.price_cents / 100).toString());
    setPackageModalVisible(true);
  };

  const handleSavePackage = async () => {
    const hours = parseFloat(pkgHours);
    const priceCents = Math.round(parseFloat(pkgPrice) * 100);
    if (!pkgName.trim() || isNaN(hours) || hours <= 0 || isNaN(priceCents) || priceCents < 0) {
      showSnackbar('Fill in all fields correctly', 'error');
      return;
    }
    try {
      if (editingPackage) {
        await updatePackage.mutateAsync({
          id: editingPackage.id,
          name: pkgName.trim(),
          num_hours: hours,
          price_cents: priceCents,
        });
        showSnackbar('Package updated', 'success');
      } else {
        await createPackage.mutateAsync({
          coach_id: id!,
          name: pkgName.trim(),
          num_hours: hours,
          price_cents: priceCents,
        });
        showSnackbar('Package created', 'success');
      }
      setPackageModalVisible(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to save package', 'error');
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    try {
      await deletePackage.mutateAsync(pkgId);
      showSnackbar('Package deleted', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete package', 'error');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Coach Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text variant="titleLarge" style={styles.coachName}>
                  {coach.first_name} {coach.last_name}
                </Text>
                <Text variant="bodyMedium" style={styles.secondaryText}>{coach.email}</Text>
                <Text variant="bodyMedium" style={styles.secondaryText}>
                  {coach.phone || 'No phone'}
                </Text>
              </View>
              <Chip
                style={[styles.statusChip, coach.is_active ? styles.activeChip : styles.inactiveChip]}
                textStyle={coach.is_active ? styles.activeChipText : styles.inactiveChipText}
              >
                {coach.is_active ? 'Active' : 'Inactive'}
              </Chip>
            </View>
            <Text variant="bodySmall" style={[styles.secondaryText, { marginTop: SPACING.sm }]}>
              Member since {formatDate(coach.created_at)}
            </Text>
          </Card.Content>
        </Card>

        {/* Rates & Packages Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Rates & Packages</Text>

            {/* Drop-in Rate */}
            <View style={styles.rateRow}>
              <Text variant="bodyMedium" style={styles.rateLabel}>Drop-in Rate</Text>
              {editingDropIn ? (
                <View style={styles.rateEditRow}>
                  <RNTextInput
                    style={styles.rateInput}
                    value={dropInInput}
                    onChangeText={setDropInInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    autoFocus
                  />
                  <Text style={styles.rateUnit}>/hr</Text>
                  <IconButton icon="check" size={20} iconColor={COLORS.success} onPress={handleSaveDropIn} />
                  <IconButton icon="close" size={20} iconColor={COLORS.error} onPress={() => setEditingDropIn(false)} />
                </View>
              ) : (
                <View style={styles.rateValueRow}>
                  <Text variant="bodyMedium" style={styles.rateValue}>
                    {formatCents(coach.drop_in_rate_cents)}
                  </Text>
                  <IconButton icon="pencil" size={18} iconColor={COLORS.textSecondary} onPress={handleStartEditDropIn} />
                </View>
              )}
            </View>

            {/* Group Rate */}
            <View style={styles.rateRow}>
              <Text variant="bodyMedium" style={styles.rateLabel}>Group Rate</Text>
              {editingGroup ? (
                <View style={styles.rateEditRow}>
                  <RNTextInput
                    style={styles.rateInput}
                    value={groupInput}
                    onChangeText={setGroupInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    autoFocus
                  />
                  <Text style={styles.rateUnit}>/hr</Text>
                  <IconButton icon="check" size={20} iconColor={COLORS.success} onPress={handleSaveGroup} />
                  <IconButton icon="close" size={20} iconColor={COLORS.error} onPress={() => setEditingGroup(false)} />
                </View>
              ) : (
                <View style={styles.rateValueRow}>
                  <Text variant="bodyMedium" style={styles.rateValue}>
                    {formatCents(coach.group_rate_cents)}
                  </Text>
                  <IconButton icon="pencil" size={18} iconColor={COLORS.textSecondary} onPress={handleStartEditGroup} />
                </View>
              )}
            </View>

            <Divider style={styles.divider} />

            {/* Packages */}
            <Text variant="titleSmall" style={styles.subsectionTitle}>Packages</Text>
            {coachPackages.length > 0 ? (
              coachPackages.map((pkg) => (
                <View key={pkg.id} style={styles.packageRow}>
                  <View style={styles.packageInfo}>
                    <Text variant="bodyMedium" style={styles.packageName}>{pkg.name}</Text>
                    <Text variant="bodySmall" style={styles.secondaryText}>
                      {pkg.num_hours} hrs - ${(pkg.price_cents / 100).toFixed(2)}
                    </Text>
                  </View>
                  <IconButton icon="pencil" size={18} iconColor={COLORS.textSecondary} onPress={() => openEditPackage(pkg)} />
                  <IconButton icon="delete" size={18} iconColor={COLORS.error} onPress={() => handleDeletePackage(pkg.id)} />
                </View>
              ))
            ) : (
              <Text variant="bodySmall" style={styles.secondaryText}>No packages yet</Text>
            )}

            <Button
              mode="outlined"
              icon="plus"
              onPress={openAddPackage}
              style={styles.addButton}
              compact
            >
              Add Package
            </Button>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsRow}>
              <Button
                mode="contained"
                icon="cash"
                onPress={() => router.push(`/(admin)/payroll/generate?coachId=${id}`)}
                style={styles.actionButton}
                compact
              >
                Generate Payroll
              </Button>
              <Button
                mode="outlined"
                icon="calendar"
                onPress={() => router.push('/(admin)/lessons/schedule')}
                style={styles.actionButton}
                compact
              >
                View Schedule
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Lesson Stats Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Lesson Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={styles.statNumber}>
                  {upcomingLessons?.length ?? 0}
                </Text>
                <Text variant="bodySmall" style={styles.secondaryText}>Upcoming</Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={styles.statNumber}>
                  {completedLessons?.length ?? 0}
                </Text>
                <Text variant="bodySmall" style={styles.secondaryText}>Completed this month</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Recent Payouts */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Recent Payouts</Text>
            {recentPayouts.length > 0 ? (
              <>
                {recentPayouts.map((payout) => (
                  <Card
                    key={payout.id}
                    style={styles.payoutCard}
                    onPress={() => router.push(`/(admin)/payroll/${payout.id}`)}
                  >
                    <Card.Content style={styles.payoutContent}>
                      <View style={styles.payoutInfo}>
                        <Text variant="bodyMedium" style={styles.payoutPeriod}>
                          {formatDate(payout.period_start)} - {formatDate(payout.period_end)}
                        </Text>
                        <Text variant="bodyLarge" style={styles.payoutAmount}>
                          ${(payout.total_cents / 100).toFixed(2)}
                        </Text>
                      </View>
                      <StatusBadge status={payout.status} />
                    </Card.Content>
                  </Card>
                ))}
                {coachPayouts.length > 5 && (
                  <Button
                    mode="text"
                    onPress={() => router.push('/(admin)/payroll')}
                    compact
                  >
                    View All ({coachPayouts.length})
                  </Button>
                )}
              </>
            ) : (
              <Text variant="bodySmall" style={styles.secondaryText}>No payouts yet</Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Package Edit Modal */}
      <Portal>
        <Modal
          visible={packageModalVisible}
          onDismiss={() => setPackageModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleMedium" style={styles.modalTitle}>
            {editingPackage ? 'Edit Package' : 'Add Package'}
          </Text>
          <TextInput
            label="Package Name"
            value={pkgName}
            onChangeText={setPkgName}
            mode="outlined"
            style={styles.modalInput}
          />
          <TextInput
            label="Hours"
            value={pkgHours}
            onChangeText={setPkgHours}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.modalInput}
          />
          <TextInput
            label="Price ($)"
            value={pkgPrice}
            onChangeText={setPkgPrice}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.modalInput}
          />
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setPackageModalVisible(false)} style={styles.modalButton}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSavePackage}
              style={[styles.modalButton, { backgroundColor: COLORS.primary }]}
              loading={createPackage.isPending || updatePackage.isPending}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  card: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  subsectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  coachName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  secondaryText: {
    color: COLORS.textSecondary,
  },
  statusChip: {
    height: 28,
  },
  activeChip: {
    backgroundColor: COLORS.successLight,
  },
  inactiveChip: {
    backgroundColor: COLORS.errorLight,
  },
  activeChipText: {
    color: COLORS.success,
    fontSize: 12,
  },
  inactiveChipText: {
    color: COLORS.error,
    fontSize: 12,
  },

  // Rates
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  rateLabel: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateValue: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  rateEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    width: 80,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  rateUnit: {
    color: COLORS.textSecondary,
    marginLeft: 4,
    fontSize: 14,
  },
  divider: {
    marginVertical: SPACING.sm,
  },

  // Packages
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    color: COLORS.textPrimary,
  },
  addButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Payouts
  payoutCard: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  payoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutInfo: {
    flex: 1,
  },
  payoutPeriod: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  payoutAmount: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },

  // Modal
  modal: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    margin: SPACING.lg,
    borderRadius: 12,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  modalInput: {
    marginBottom: SPACING.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalButton: {
    minWidth: 100,
  },
});
