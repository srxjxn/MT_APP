import React, { useState, useCallback } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Text, Button, Portal, Modal, Dialog, RadioButton } from 'react-native-paper';
import { useAuthStore } from '@/lib/stores/authStore';
import { useParentStudents, useCreateStudent } from '@/lib/hooks/useStudents';
import { useParentUpcomingLessons } from '@/lib/hooks/useLessonInstances';
import { useParentMonthlyGroupAttendance } from '@/lib/hooks/useParentAttendance';
import { useStudentNotes } from '@/lib/hooks/useStudentNotes';
import { useAssignedCoachWithPackages } from '@/lib/hooks/useAssignedCoach';
import { useParentAllStudentPackages } from '@/lib/hooks/useStudentPackages';
import { useStripeCheckoutPayment } from '@/lib/hooks/useStripePayments';
import { useUIStore } from '@/lib/stores/uiStore';
import { StudentForm } from '@/components/students/StudentForm';
import { NoteCard } from '@/components/students/NoteCard';
import { MonthlyAttendanceCard } from '@/components/billing/MonthlyAttendanceCard';
import { CoachPricingCard } from '@/components/private-lessons/CoachPricingCard';
import { LoadingScreen, EmptyState, StatusBadge } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { Student, CoachPackage } from '@/lib/types';
import { StudentFormData } from '@/lib/validation/student';
import { LessonInstanceWithJoins } from '@/lib/hooks/useLessonInstances';
import { formatTime } from '@/lib/utils/formatTime';

function StudentNotesModal({ studentId, studentName, visible, onDismiss }: {
  studentId: string;
  studentName: string;
  visible: boolean;
  onDismiss: () => void;
}) {
  const { data: notes } = useStudentNotes(studentId);
  const publicNotes = notes?.filter((n) => !n.is_private) ?? [];

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <ScrollView>
          <Text variant="titleLarge" style={styles.modalTitle}>
            Notes for {studentName}
          </Text>
          {publicNotes.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyNotes}>No notes yet</Text>
          ) : (
            publicNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))
          )}
          <Button mode="outlined" onPress={onDismiss} style={styles.closeButton}>
            Close
          </Button>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

export default function ParentHome() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const { data: students, isLoading, refetch, isRefetching } = useParentStudents();
  const { data: upcomingData } = useParentUpcomingLessons();
  const { data: attendance } = useParentMonthlyGroupAttendance();
  const { data: assignedCoach } = useAssignedCoachWithPackages();
  const { data: ownedPackages } = useParentAllStudentPackages();
  const createStudent = useCreateStudent();
  const checkoutPayment = useStripeCheckoutPayment();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notesStudent, setNotesStudent] = useState<{ id: string; name: string } | null>(null);

  // Package purchase state
  const [buyingPackage, setBuyingPackage] = useState<CoachPackage | null>(null);
  const [buyingCoachName, setBuyingCoachName] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedBuyStudentId, setSelectedBuyStudentId] = useState<string>('');

  const handleAddChild = async (data: StudentFormData) => {
    try {
      await createStudent.mutateAsync(data);
      showSnackbar('Child added successfully', 'success');
      setShowAddForm(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to add child', 'error');
    }
  };

  // Package purchase handlers
  const handleBuyPackage = useCallback((pkg: CoachPackage, coachName: string) => {
    setBuyingPackage(pkg);
    setBuyingCoachName(coachName);
    setSelectedBuyStudentId(students?.length === 1 ? students[0].id : '');
    setShowStudentPicker(true);
  }, [students]);

  const handleConfirmStudentForPackage = useCallback(async () => {
    if (!selectedBuyStudentId || !buyingPackage) return;
    setShowStudentPicker(false);
    try {
      const result = await checkoutPayment.mutateAsync({
        amount_cents: buyingPackage.price_cents,
        payment_type: 'lesson',
        description: `Package: ${buyingPackage.name} (${buyingPackage.num_hours}hrs) from ${buyingCoachName}`,
        post_action: {
          type: 'create_package',
          student_id: selectedBuyStudentId,
          coach_package_id: buyingPackage.id,
          hours_purchased: buyingPackage.num_hours,
        },
      });
      if (result?.redirected) {
        showSnackbar('Complete payment in your browser', 'success');
      }
      setBuyingPackage(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Payment failed', 'error');
    }
  }, [selectedBuyStudentId, buyingPackage, buyingCoachName, checkoutPayment, showSnackbar]);


  // Owned packages from assigned coach
  const coachPackages = assignedCoach
    ? (ownedPackages ?? []).filter((p) => p.coach_package.coach_id === assignedCoach.id && p.status === 'active')
    : [];

  if (isLoading) {
    return <LoadingScreen message="Loading..." testID="parent-home-loading" />;
  }

  // Collect upcoming lessons across all children, limited to 5
  const upcomingLessons: { studentName: string; instance: LessonInstanceWithJoins }[] = [];
  if (upcomingData) {
    for (const group of upcomingData) {
      for (const instance of group.instances) {
        if (instance.lesson_type !== 'group') continue;
        upcomingLessons.push({ studentName: group.studentName, instance });
      }
    }
    upcomingLessons.sort((a, b) => {
      const dateComp = a.instance.date.localeCompare(b.instance.date);
      if (dateComp !== 0) return dateComp;
      return a.instance.start_time.localeCompare(b.instance.start_time);
    });
    upcomingLessons.splice(5);
  }

  const renderStudent = ({ item }: { item: Student }) => (
    <Card style={styles.card} testID={`child-card-${item.id}`}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.name}>
            {item.first_name} {item.last_name}
          </Text>
          <StatusBadge status={item.skill_level} />
        </View>
        {item.date_of_birth && (
          <Text variant="bodySmall" style={styles.detail}>
            Date of Birth: {item.date_of_birth}
          </Text>
        )}
        <Button
          mode="text"
          icon="note-text"
          onPress={() => setNotesStudent({ id: item.id, name: `${item.first_name} ${item.last_name}` })}
          compact
          style={styles.viewNotesButton}
          testID={`view-notes-${item.id}`}
        >
          View Notes
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container} testID="parent-home">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
      >
        <Text variant="headlineSmall" style={styles.welcome}>
          Welcome, {userProfile?.first_name ?? 'Parent'}!
        </Text>

        {attendance && attendance.length > 0 && (
          <View style={styles.attendanceSection}>
            <MonthlyAttendanceCard attendance={attendance} testID="monthly-attendance" />
          </View>
        )}

        {upcomingLessons.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Upcoming Lessons
            </Text>
            {upcomingLessons.map(({ studentName, instance }) => (
              <Card key={`${instance.id}-${studentName}`} style={styles.upcomingCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.upcomingChild}>{studentName}</Text>
                  <Text variant="titleSmall" style={styles.upcomingName}>
                    {instance.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.detail}>
                    {instance.date} • {formatTime(instance.start_time)} - {formatTime(instance.end_time)}
                  </Text>
                  <Text variant="bodySmall" style={styles.detail}>
                    {instance.coach ? `${instance.coach.first_name} ${instance.coach.last_name}` : ''}
                    {instance.court ? ` • ${instance.court.name}` : ''}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
        {upcomingLessons.length === 0 && (students?.length ?? 0) > 0 && (
          <View style={styles.upcomingSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Upcoming Lessons
            </Text>
            <Text variant="bodyMedium" style={styles.emptyNotes}>No upcoming lessons</Text>
          </View>
        )}

        {assignedCoach && (
          <View style={styles.coachSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Your Coach
            </Text>
            <CoachPricingCard
              coach={assignedCoach}
              onBuyPackage={(pkg) => handleBuyPackage(pkg, `${assignedCoach.first_name} ${assignedCoach.last_name}`)}
            />
            {coachPackages.length > 0 && (
              <View style={styles.ownedPackages}>
                <Text variant="bodySmall" style={styles.ownedLabel}>
                  Your active packages with {assignedCoach.first_name}:
                </Text>
                {coachPackages.map((p) => (
                  <Text key={p.id} variant="bodySmall" style={styles.ownedItem}>
                    {p.coach_package.name} — {p.hours_purchased - p.hours_used}h remaining
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.childrenSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            My Children
          </Text>
          {students?.map((student) => (
            <React.Fragment key={student.id}>
              {renderStudent({ item: student })}
            </React.Fragment>
          ))}
          {(!students || students.length === 0) && (
            <EmptyState
              icon="account-child"
              title="No Children Yet"
              description="Add your child to start enrolling in lessons"
              actionLabel="Add Child"
              onAction={() => setShowAddForm(true)}
            />
          )}
          {(students?.length ?? 0) > 0 && (
            <Button
              mode="contained"
              onPress={() => setShowAddForm(true)}
              style={styles.addButton}
              testID="add-child-button"
            >
              Add Child
            </Button>
          )}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showAddForm}
          onDismiss={() => setShowAddForm(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text variant="titleLarge" style={styles.modalTitle}>Add Child</Text>
            <StudentForm
              initialValues={{ parent_id: userProfile?.id }}
              showParentPicker={false}
              onSubmit={handleAddChild}
              loading={createStudent.isPending}
              submitLabel="Add Child"
              testID="add-child-form"
            />
          </ScrollView>
        </Modal>
      </Portal>

      {notesStudent && (
        <StudentNotesModal
          studentId={notesStudent.id}
          studentName={notesStudent.name}
          visible={!!notesStudent}
          onDismiss={() => setNotesStudent(null)}
        />
      )}

      {/* Student picker for package purchase */}
      <Portal>
        <Dialog visible={showStudentPicker} onDismiss={() => setShowStudentPicker(false)}>
          <Dialog.Content style={styles.studentPickerContent}>
            <MaterialCommunityIcons
              name="account-child-circle"
              size={48}
              color={COLORS.primary}
              style={styles.studentPickerIcon}
            />
            {buyingPackage && (
              <Text variant="bodyMedium" style={styles.confirmText}>
                Buy {buyingPackage.name} ({buyingPackage.num_hours}hrs) from {buyingCoachName} for ${(buyingPackage.price_cents / 100).toFixed(0)}?
              </Text>
            )}
            <Text variant="bodySmall" style={styles.selectLabel}>Who is this package for?</Text>
            <RadioButton.Group onValueChange={setSelectedBuyStudentId} value={selectedBuyStudentId}>
              {(students ?? []).map((s) => (
                <RadioButton.Item
                  key={s.id}
                  label={`${s.first_name} ${s.last_name}`}
                  value={s.id}
                  color={COLORS.primary}
                  labelStyle={styles.radioLabel}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowStudentPicker(false)} disabled={checkoutPayment.isPending}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleConfirmStudentForPackage}
              disabled={!selectedBuyStudentId || checkoutPayment.isPending}
              loading={checkoutPayment.isPending}
              style={styles.continueButton}
            >
              Continue to Payment
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
  welcome: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    padding: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  attendanceSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  upcomingSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  upcomingCard: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  upcomingChild: {
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  upcomingName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    paddingBottom: SPACING.sm,
    fontWeight: '600',
  },
  childrenSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  detail: {
    color: COLORS.textSecondary,
  },
  viewNotesButton: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  addButton: {
    margin: SPACING.md,
  },
  modal: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    color: COLORS.textPrimary,
    padding: SPACING.md,
    paddingBottom: 0,
  },
  emptyNotes: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  closeButton: {
    margin: SPACING.md,
  },
  coachSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  ownedPackages: {
    marginTop: SPACING.xs,
  },
  ownedLabel: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  ownedItem: {
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  confirmText: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  selectLabel: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  radioLabel: {
    color: COLORS.textPrimary,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
  },
  studentPickerContent: {
    alignItems: 'center',
  },
  studentPickerIcon: {
    marginBottom: 8,
  },
});
