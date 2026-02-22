import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Card, Text, Button, ProgressBar, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAllStudentPackages, AdminStudentPackage, useBillParentForPackage } from '@/lib/hooks/useStudentPackages';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';

function PackageCard({ pkg, onBillParent }: { pkg: AdminStudentPackage; onBillParent: () => void }) {
  const hoursRemaining = pkg.hours_purchased - pkg.hours_used;
  const progress = pkg.hours_purchased > 0 ? pkg.hours_used / pkg.hours_purchased : 0;
  const isLow = hoursRemaining <= 1;
  const progressColor = isLow ? COLORS.warning : COLORS.success;

  return (
    <Card style={[styles.card, isLow && styles.lowCard]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.studentName}>
            {pkg.student.first_name} {pkg.student.last_name}
          </Text>
          {pkg.needs_billing && (
            <Chip compact style={styles.billedChip} textStyle={styles.billedChipText}>
              Billed
            </Chip>
          )}
        </View>
        <Text variant="bodyMedium" style={styles.coachName}>
          Coach: {pkg.coach_package.coach.first_name} {pkg.coach_package.coach.last_name}
        </Text>
        <View style={styles.hoursRow}>
          <Text variant="bodySmall" style={styles.hoursText}>
            {pkg.hours_used}h used / {pkg.hours_purchased}h purchased
          </Text>
          <Text variant="bodySmall" style={[styles.hoursRemaining, { color: progressColor }]}>
            {hoursRemaining}h remaining
          </Text>
        </View>
        <ProgressBar progress={progress} color={progressColor} style={styles.progressBar} />
        {isLow && !pkg.needs_billing && (
          <Button
            mode="contained"
            onPress={onBillParent}
            style={styles.billButton}
            icon="send"
            compact
          >
            Bill Parent
          </Button>
        )}
        {isLow && pkg.needs_billing && (
          <View style={styles.billedRow}>
            <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.success} />
            <Text variant="bodySmall" style={styles.billedText}>
              Parent notified{pkg.billed_at ? ` on ${new Date(pkg.billed_at).toLocaleDateString()}` : ''}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

export default function PackageBillingScreen() {
  const { data: packages, isLoading, refetch, isRefetching } = useAllStudentPackages();
  const billParent = useBillParentForPackage();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleBillParent = async (pkg: AdminStudentPackage) => {
    try {
      await billParent.mutateAsync({
        packageId: pkg.id,
        parentId: pkg.student.parent_id,
        studentName: `${pkg.student.first_name} ${pkg.student.last_name}`,
      });
      showSnackbar('Parent notified about package billing', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to bill parent', 'error');
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading packages..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={packages}
        renderItem={({ item }) => (
          <PackageCard pkg={item} onBillParent={() => handleBillParent(item)} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={packages?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="package-variant"
            title="No Packages"
            description="No student packages found"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  list: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
  },
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  lowCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  studentName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  billedChip: {
    backgroundColor: COLORS.successLight,
  },
  billedChipText: {
    color: COLORS.success,
    fontSize: 11,
  },
  coachName: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  hoursText: {
    color: COLORS.textSecondary,
  },
  hoursRemaining: {
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  billButton: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.warning,
  },
  billedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  billedText: {
    color: COLORS.success,
  },
});
