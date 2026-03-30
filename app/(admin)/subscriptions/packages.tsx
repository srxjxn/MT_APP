import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Card, Text, Button, ProgressBar, Chip, FAB, Portal, Modal, Menu, Dialog, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useAllStudentPackages,
  AdminStudentPackage,
  useBillParentForPackage,
  useCreateStudentPackage,
  useUpdateStudentPackage,
  useDeleteStudentPackage,
} from '@/lib/hooks/useStudentPackages';
import { useStudents } from '@/lib/hooks/useStudents';
import { useCoachDirectory, CoachWithPricing } from '@/lib/hooks/useCoachPricing';
import { LoadingScreen, EmptyState, FormField } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { CoachPackage } from '@/lib/types';

function PackageCard({
  pkg,
  onBillParent,
  onAddHours,
  onEditHours,
  onDelete,
}: {
  pkg: AdminStudentPackage;
  onBillParent: () => void;
  onAddHours: () => void;
  onEditHours: () => void;
  onDelete: () => void;
}) {
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
        <View style={styles.cardActions}>
          <Button
            mode="outlined"
            onPress={onAddHours}
            icon="plus-circle"
            compact
            style={styles.addHoursButton}
          >
            Add Hours
          </Button>
          <IconButton
            icon="pencil"
            size={20}
            onPress={onEditHours}
            iconColor={COLORS.primary}
            style={styles.iconBtn}
          />
          <IconButton
            icon="delete"
            size={20}
            onPress={onDelete}
            iconColor={COLORS.error}
            style={styles.iconBtn}
          />
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
        </View>
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

function AddHoursModal({
  visible,
  pkg,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  pkg: AdminStudentPackage | null;
  onDismiss: () => void;
  onSubmit: (hours: number) => void;
}) {
  const [hoursToAdd, setHoursToAdd] = useState('');

  const handleSubmit = () => {
    const hours = parseFloat(hoursToAdd);
    if (hours > 0) {
      onSubmit(hours);
      setHoursToAdd('');
    }
  };

  const handleDismiss = () => {
    setHoursToAdd('');
    onDismiss();
  };

  if (!pkg) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.modalTitle}>Add Hours</Text>
        <Text variant="bodyMedium" style={styles.modalContext}>
          {pkg.student.first_name} {pkg.student.last_name} — Coach {pkg.coach_package.coach.first_name} {pkg.coach_package.coach.last_name}
        </Text>
        <Text variant="bodySmall" style={styles.modalHours}>
          {pkg.hours_used}h used / {pkg.hours_purchased}h purchased
        </Text>
        <FormField
          label="Hours to Add"
          value={hoursToAdd}
          onChangeText={setHoursToAdd}
          keyboardType="decimal-pad"
          placeholder="e.g. 1.5"
        />
        <View style={styles.modalActions}>
          <Button onPress={handleDismiss}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!hoursToAdd || parseFloat(hoursToAdd) <= 0}
          >
            Add Hours
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

function EditHoursModal({
  visible,
  pkg,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  pkg: AdminStudentPackage | null;
  onDismiss: () => void;
  onSubmit: (newHours: number) => void;
}) {
  const [hours, setHours] = useState('');
  const parsedHours = parseFloat(hours);
  const minHours = pkg?.hours_used ?? 0;
  const belowUsed = !isNaN(parsedHours) && parsedHours < minHours;

  // Pre-fill when pkg changes
  React.useEffect(() => {
    if (visible && pkg) setHours(String(pkg.hours_purchased));
  }, [visible, pkg]);

  const handleDismiss = () => {
    setHours('');
    onDismiss();
  };

  const handleSubmit = () => {
    if (!isNaN(parsedHours) && parsedHours >= minHours) {
      onSubmit(parsedHours);
      setHours('');
    }
  };

  if (!pkg) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.modal}
      >
        <Text variant="titleLarge" style={styles.modalTitle}>Edit Hours</Text>
        <Text variant="bodyMedium" style={styles.modalContext}>
          {pkg.student.first_name} {pkg.student.last_name} — Coach {pkg.coach_package.coach.first_name} {pkg.coach_package.coach.last_name}
        </Text>
        <Text variant="bodySmall" style={styles.modalHours}>
          {pkg.hours_used}h used / {pkg.hours_purchased}h purchased
        </Text>
        <FormField
          label="Total Hours Purchased"
          value={hours}
          onChangeText={setHours}
          keyboardType="numeric"
          error={belowUsed ? `Cannot be less than ${minHours}h already used` : undefined}
        />
        <View style={styles.modalActions}>
          <Button onPress={handleDismiss}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            disabled={!hours || isNaN(parsedHours) || parsedHours < minHours}
          >
            Save
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

function DeletePackageDialog({
  visible,
  pkg,
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  pkg: AdminStudentPackage | null;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  if (!pkg) return null;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Delete this package?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            {pkg.student.first_name} {pkg.student.last_name} — Coach {pkg.coach_package.coach.first_name} {pkg.coach_package.coach.last_name}
          </Text>
          <Text variant="bodySmall" style={{ color: COLORS.textSecondary, marginTop: SPACING.xs }}>
            {pkg.hours_used}h used / {pkg.hours_purchased}h purchased
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button textColor={COLORS.error} onPress={onConfirm}>Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

function CreatePackageModal({
  visible,
  onDismiss,
  onSubmit,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (data: { student_id: string; coach_package_id: string; hours_purchased: number }) => void;
}) {
  const { data: students } = useStudents();
  const { data: coaches } = useCoachDirectory();

  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<CoachWithPricing | null>(null);
  const [selectedCoachPkg, setSelectedCoachPkg] = useState<CoachPackage | null>(null);
  const [hours, setHours] = useState('');

  const [studentMenuVisible, setStudentMenuVisible] = useState(false);
  const [coachMenuVisible, setCoachMenuVisible] = useState(false);
  const [pkgMenuVisible, setPkgMenuVisible] = useState(false);

  const coachPackages = selectedCoach?.packages ?? [];

  const resetForm = () => {
    setSelectedStudent(null);
    setSelectedCoach(null);
    setSelectedCoachPkg(null);
    setHours('');
  };

  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };

  const handleCoachSelect = (coach: CoachWithPricing) => {
    setSelectedCoach(coach);
    setSelectedCoachPkg(null);
    setHours('');
    setCoachMenuVisible(false);
  };

  const handleCoachPkgSelect = (pkg: CoachPackage) => {
    setSelectedCoachPkg(pkg);
    setHours(String(pkg.num_hours));
    setPkgMenuVisible(false);
  };

  const handleSubmit = () => {
    const h = parseFloat(hours);
    if (selectedStudent && selectedCoachPkg && h > 0) {
      onSubmit({
        student_id: selectedStudent.id,
        coach_package_id: selectedCoachPkg.id,
        hours_purchased: h,
      });
      resetForm();
    }
  };

  const canSubmit = selectedStudent && selectedCoachPkg && hours && parseFloat(hours) > 0;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleDismiss} contentContainerStyle={styles.modal}>
        <Text variant="titleLarge" style={styles.modalTitle}>Grant Package</Text>

        {/* Student Picker */}
        <Menu
          visible={studentMenuVisible}
          onDismiss={() => setStudentMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setStudentMenuVisible(true)}
              style={styles.menuButton}
              icon="account"
              contentStyle={styles.menuButtonContent}
            >
              {selectedStudent ? selectedStudent.name : 'Select Student'}
            </Button>
          }
        >
          <ScrollView style={{ maxHeight: 300 }}>
            {(students ?? []).map((s) => (
              <Menu.Item
                key={s.id}
                title={`${s.first_name} ${s.last_name}`}
                onPress={() => {
                  setSelectedStudent({ id: s.id, name: `${s.first_name} ${s.last_name}` });
                  setStudentMenuVisible(false);
                }}
              />
            ))}
          </ScrollView>
        </Menu>

        {/* Coach Picker */}
        <Menu
          visible={coachMenuVisible}
          onDismiss={() => setCoachMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setCoachMenuVisible(true)}
              style={styles.menuButton}
              icon="whistle"
              contentStyle={styles.menuButtonContent}
            >
              {selectedCoach ? `${selectedCoach.first_name} ${selectedCoach.last_name}` : 'Select Coach'}
            </Button>
          }
        >
          <ScrollView style={{ maxHeight: 300 }}>
            {(coaches ?? []).map((c) => (
              <Menu.Item
                key={c.id}
                title={`${c.first_name} ${c.last_name}`}
                onPress={() => handleCoachSelect(c)}
              />
            ))}
          </ScrollView>
        </Menu>

        {/* Coach Package Picker */}
        <Menu
          visible={pkgMenuVisible}
          onDismiss={() => setPkgMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setPkgMenuVisible(true)}
              style={styles.menuButton}
              icon="package-variant"
              contentStyle={styles.menuButtonContent}
              disabled={!selectedCoach}
            >
              {selectedCoachPkg
                ? `${selectedCoachPkg.name} (${selectedCoachPkg.num_hours}h — $${(selectedCoachPkg.price_cents / 100).toFixed(0)})`
                : 'Select Package'}
            </Button>
          }
        >
          <ScrollView style={{ maxHeight: 300 }}>
            {coachPackages.map((p) => (
              <Menu.Item
                key={p.id}
                title={`${p.name} — ${p.num_hours}h — $${(p.price_cents / 100).toFixed(0)}`}
                onPress={() => handleCoachPkgSelect(p)}
              />
            ))}
          </ScrollView>
        </Menu>

        <FormField
          label="Hours to Grant"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          placeholder="e.g. 1.5"
        />

        <View style={styles.modalActions}>
          <Button onPress={handleDismiss}>Cancel</Button>
          <Button mode="contained" onPress={handleSubmit} disabled={!canSubmit}>
            Grant Package
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

export default function PackageBillingScreen() {
  const { data: packages, isLoading, refetch, isRefetching } = useAllStudentPackages();
  const billParent = useBillParentForPackage();
  const updatePackage = useUpdateStudentPackage();
  const createPackage = useCreateStudentPackage();
  const deletePackage = useDeleteStudentPackage();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [addHoursPkg, setAddHoursPkg] = useState<AdminStudentPackage | null>(null);
  const [editHoursPkg, setEditHoursPkg] = useState<AdminStudentPackage | null>(null);
  const [deletePkg, setDeletePkg] = useState<AdminStudentPackage | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);

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

  const handleAddHours = async (hours: number) => {
    if (!addHoursPkg) return;
    try {
      await updatePackage.mutateAsync({
        id: addHoursPkg.id,
        hours_purchased: addHoursPkg.hours_purchased + hours,
        status: 'active',
      });
      showSnackbar(`Added ${hours}h to package`, 'success');
      setAddHoursPkg(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to add hours', 'error');
    }
  };

  const handleEditHours = async (newHours: number) => {
    if (!editHoursPkg) return;
    try {
      await updatePackage.mutateAsync({
        id: editHoursPkg.id,
        hours_purchased: newHours,
        status: newHours > editHoursPkg.hours_used ? 'active' : editHoursPkg.status,
      });
      showSnackbar(`Updated package to ${newHours}h`, 'success');
      setEditHoursPkg(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update hours', 'error');
    }
  };

  const handleDeletePackage = async () => {
    if (!deletePkg) return;
    try {
      await deletePackage.mutateAsync(deletePkg.id);
      showSnackbar('Package deleted', 'success');
      setDeletePkg(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to delete package', 'error');
    }
  };

  const handleCreatePackage = async (data: {
    student_id: string;
    coach_package_id: string;
    hours_purchased: number;
  }) => {
    try {
      await createPackage.mutateAsync({
        student_id: data.student_id,
        coach_package_id: data.coach_package_id,
        hours_purchased: data.hours_purchased,
        hours_used: 0,
        status: 'active',
      });
      showSnackbar('Package granted successfully', 'success');
      setCreateModalVisible(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to grant package', 'error');
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
          <PackageCard
            pkg={item}
            onBillParent={() => handleBillParent(item)}
            onAddHours={() => setAddHoursPkg(item)}
            onEditHours={() => setEditHoursPkg(item)}
            onDelete={() => setDeletePkg(item)}
          />
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
      <FAB icon="plus" style={styles.fab} onPress={() => setCreateModalVisible(true)} />
      <AddHoursModal
        visible={!!addHoursPkg}
        pkg={addHoursPkg}
        onDismiss={() => setAddHoursPkg(null)}
        onSubmit={handleAddHours}
      />
      <EditHoursModal
        visible={!!editHoursPkg}
        pkg={editHoursPkg}
        onDismiss={() => setEditHoursPkg(null)}
        onSubmit={handleEditHours}
      />
      <DeletePackageDialog
        visible={!!deletePkg}
        pkg={deletePkg}
        onDismiss={() => setDeletePkg(null)}
        onConfirm={handleDeletePackage}
      />
      <CreatePackageModal
        visible={createModalVisible}
        onDismiss={() => setCreateModalVisible(false)}
        onSubmit={handleCreatePackage}
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
    paddingBottom: 80,
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
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addHoursButton: {
    borderColor: COLORS.primary,
  },
  iconBtn: {
    margin: 0,
  },
  billButton: {
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
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.lg,
    padding: SPACING.lg,
    borderRadius: 12,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  modalContext: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  modalHours: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  menuButton: {
    marginBottom: SPACING.sm,
  },
  menuButtonContent: {
    justifyContent: 'flex-start',
  },
});
