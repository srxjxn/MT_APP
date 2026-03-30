import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SegmentedButtons, Text, Portal, Dialog, Button, RadioButton } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { useParentStudents } from '@/lib/hooks/useStudents';
import { useCoachDirectory } from '@/lib/hooks/useCoachPricing';
import { useParentLessonRequests, useUpdateLessonRequest, useLinkPaymentToRequest, LessonRequestWithJoins } from '@/lib/hooks/useLessonRequests';
import { useStudentPackages, useDeductPackageHours, useCreateStudentPackage, findActivePackage, StudentPackageWithDetails } from '@/lib/hooks/useStudentPackages';
import { useStripeCheckoutPayment, useRecordExternalPayment } from '@/lib/hooks/useStripePayments';
import { useStudentPrimaryCoach, useStudentPrivateLessonStats } from '@/lib/hooks/usePrivateLessonStats';
import { StudentPackageCard } from '@/components/private-lessons/StudentPackageCard';
import { CoachPricingCard } from '@/components/private-lessons/CoachPricingCard';
import { LessonRequestCard } from '@/components/private-lessons/LessonRequestCard';
import { RequestLessonModal } from '@/components/private-lessons/RequestLessonModal';
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { Student, CoachPackage } from '@/lib/types';
import { CoachWithPricing } from '@/lib/hooks/useCoachPricing';
import { useUIStore } from '@/lib/stores/uiStore';

type TabValue = 'students' | 'coaches' | 'requests';

function StudentCardWrapper({
  student,
  onRequestLesson,
}: {
  student: Student;
  onRequestLesson: (studentId: string, coachId?: string) => void;
}) {
  const { data: packages } = useStudentPackages(student.id);
  const { data: primaryCoach } = useStudentPrimaryCoach(student.id);
  const { data: stats } = useStudentPrivateLessonStats(student.id);

  const coachName = primaryCoach
    ? `${primaryCoach.first_name} ${primaryCoach.last_name}`
    : null;

  return (
    <StudentPackageCard
      studentName={`${student.first_name} ${student.last_name}`}
      primaryCoach={coachName}
      packages={packages ?? []}
      lessonStats={stats ?? { upcoming: 0, completed: 0 }}
      onRequestLesson={() => onRequestLesson(student.id, primaryCoach?.id)}
    />
  );
}

export function PrivateLessonsContent() {
  const [tab, setTab] = useState<TabValue>('students');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [payingRequest, setPayingRequest] = useState<LessonRequestWithJoins | null>(null);
  const [requestPackageMap, setRequestPackageMap] = useState<Map<string, StudentPackageWithDetails>>(new Map());
  // Package purchase state
  const [buyingPackage, setBuyingPackage] = useState<CoachPackage | null>(null);
  const [buyingCoachName, setBuyingCoachName] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedBuyStudentId, setSelectedBuyStudentId] = useState<string>('');
  const [showBuyPaymentSelector, setShowBuyPaymentSelector] = useState(false);
  const [paymentContext, setPaymentContext] = useState<'request' | 'package'>('request');

  const { data: students, isLoading: studentsLoading, refetch: refetchStudents, isRefetching: studentsRefetching } = useParentStudents();
  const { data: coaches, isLoading: coachesLoading, refetch: refetchCoaches, isRefetching: coachesRefetching } = useCoachDirectory();
  const { data: requests, isLoading: requestsLoading, refetch: refetchRequests, isRefetching: requestsRefetching } = useParentLessonRequests();
  const updateRequest = useUpdateLessonRequest();
  const linkPayment = useLinkPaymentToRequest();
  const deductHours = useDeductPackageHours();
  const createStudentPackage = useCreateStudentPackage();
  const checkoutPayment = useStripeCheckoutPayment();
  const recordExternal = useRecordExternalPayment();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  // Check packages for approved unpaid requests
  useEffect(() => {
    if (!requests) return;
    const approvedUnpaid = requests.filter((r) => r.status === 'approved' && !r.payment_id);
    if (approvedUnpaid.length === 0) return;

    const checkPackages = async () => {
      const map = new Map<string, StudentPackageWithDetails>();
      for (const req of approvedUnpaid) {
        try {
          const pkg = await findActivePackage(req.student_id, req.coach_id);
          if (pkg) map.set(req.id, pkg);
        } catch {
          // Ignore errors
        }
      }
      setRequestPackageMap(map);
    };
    checkPackages();
  }, [requests]);

  const openRequestModal = useCallback((studentId?: string, coachId?: string) => {
    setSelectedStudentId(studentId);
    setSelectedCoachId(coachId);
    setShowRequestModal(true);
  }, []);

  const handleCancelRequest = useCallback(async (requestId: string) => {
    try {
      await updateRequest.mutateAsync({ id: requestId, status: 'cancelled' });
    } catch {
      // Error handled by mutation
    }
  }, [updateRequest]);

  const handlePayNow = useCallback((request: LessonRequestWithJoins) => {
    setPayingRequest(request);
    setShowPaymentSelector(true);
  }, []);

  const handleUsePackage = useCallback(async (request: LessonRequestWithJoins) => {
    const pkg = requestPackageMap.get(request.id);
    if (!pkg) return;

    try {
      // Deduct 1 hour from package
      await deductHours.mutateAsync({ packageId: pkg.id, hoursToDeduct: 1 });

      // Record as a "paid" request (package deduction, no actual payment)
      const payment = await recordExternal.mutateAsync({
        amount_cents: 0,
        payment_type: 'lesson',
        payment_platform: 'other',
        description: `Package hours used: ${pkg.coach_package.name}`,
      });

      await linkPayment.mutateAsync({ requestId: request.id, paymentId: payment.id });
      showSnackbar('Package hours deducted!', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to use package', 'error');
    }
  }, [requestPackageMap, deductHours, recordExternal, linkPayment, showSnackbar]);

  const getCoachDropInRate = useCallback((coachId: string): number => {
    const coach = coaches?.find((c) => c.id === coachId);
    return coach?.drop_in_rate_cents ?? 0;
  }, [coaches]);

  // Package purchase handlers
  const handleBuyPackage = useCallback((pkg: CoachPackage, coachName: string) => {
    setBuyingPackage(pkg);
    setBuyingCoachName(coachName);
    setSelectedBuyStudentId('');
    setShowStudentPicker(true);
  }, []);

  const handleConfirmStudentForPackage = useCallback(() => {
    if (!selectedBuyStudentId) return;
    setShowStudentPicker(false);
    setPaymentContext('package');
    setShowBuyPaymentSelector(true);
  }, [selectedBuyStudentId]);

  const createPackageAfterPayment = async (paymentId: string) => {
    if (!buyingPackage || !selectedBuyStudentId) return;
    await createStudentPackage.mutateAsync({
      student_id: selectedBuyStudentId,
      coach_package_id: buyingPackage.id,
      hours_purchased: buyingPackage.num_hours,
      hours_used: 0,
      status: 'active',
      purchased_at: new Date().toISOString(),
    });
  };

  const handleStripePayment = async () => {
    if (paymentContext === 'package') {
      setShowBuyPaymentSelector(false);
      if (!buyingPackage || !selectedBuyStudentId) return;
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
      return;
    }

    // Private lesson payment
    if (!payingRequest) return;
    setShowPaymentSelector(false);
    const rateCents = getCoachDropInRate(payingRequest.coach_id);
    if (rateCents <= 0) {
      showSnackbar('Coach drop-in rate not set', 'error');
      return;
    }

    try {
      const result = await checkoutPayment.mutateAsync({
        amount_cents: rateCents,
        payment_type: 'drop_in',
        description: `Private lesson with ${payingRequest.coach.first_name} ${payingRequest.coach.last_name}`,
        post_action: {
          type: 'link_request',
          request_id: payingRequest.id,
        },
      });
      if (result?.redirected) {
        showSnackbar('Complete payment in your browser', 'success');
      }
      setPayingRequest(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Payment failed', 'error');
    }
  };

  const handleExternalPayment = async () => {
    if (paymentContext === 'package') {
      setShowBuyPaymentSelector(false);
      if (!buyingPackage) return;
      try {
        const payment = await recordExternal.mutateAsync({
          amount_cents: buyingPackage.price_cents,
          payment_type: 'lesson',
          payment_platform: 'cash',
          description: `Package: ${buyingPackage.name} (${buyingPackage.num_hours}hrs) from ${buyingCoachName}`,
        });
        await createPackageAfterPayment(payment.id);
        showSnackbar('Package purchased!', 'success');
        setBuyingPackage(null);
      } catch (err: any) {
        showSnackbar(err.message ?? 'Failed to record payment', 'error');
      }
      return;
    }

    // Private lesson external payment
    if (!payingRequest) return;
    setShowPaymentSelector(false);
    const rateCents = getCoachDropInRate(payingRequest.coach_id);

    try {
      const payment = await recordExternal.mutateAsync({
        amount_cents: rateCents > 0 ? rateCents : 0,
        payment_type: 'drop_in',
        payment_platform: 'cash',
        description: `Private lesson with ${payingRequest.coach.first_name} ${payingRequest.coach.last_name}`,
      });
      await linkPayment.mutateAsync({ requestId: payingRequest.id, paymentId: payment.id });
      showSnackbar('Payment recorded!', 'success');
      setPayingRequest(null);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to record payment', 'error');
    }
  };

  const renderStudentItem = useCallback(({ item }: { item: Student }) => (
    <StudentCardWrapper student={item} onRequestLesson={openRequestModal} />
  ), [openRequestModal]);

  const renderCoachItem = useCallback(({ item }: { item: CoachWithPricing }) => (
    <CoachPricingCard
      coach={item}
      onBuyPackage={(pkg) => handleBuyPackage(pkg, `${item.first_name} ${item.last_name}`)}
    />
  ), [openRequestModal, handleBuyPackage]);

  const renderRequestItem = useCallback(({ item }: { item: LessonRequestWithJoins }) => {
    const pkg = requestPackageMap.get(item.id);
    const packageInfo = pkg
      ? `Will use 1 hour from "${pkg.coach_package.name}" (${pkg.hours_purchased - pkg.hours_used}h remaining)`
      : null;
    const dropInRate = getCoachDropInRate(item.coach_id);
    const showPayNow = item.status === 'approved' && !item.payment_id && !pkg && dropInRate > 0;

    return (
      <LessonRequestCard
        request={item}
        onCancel={() => handleCancelRequest(item.id)}
        onPayNow={showPayNow ? () => handlePayNow(item) : undefined}
        onUsePackage={pkg ? () => handleUsePackage(item) : undefined}
        packageInfo={packageInfo}
      />
    );
  }, [handleCancelRequest, handlePayNow, handleUsePackage, requestPackageMap, getCoachDropInRate]);

  const isLoading = tab === 'students' ? studentsLoading : tab === 'coaches' ? coachesLoading : requestsLoading;

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as TabValue)}
        buttons={[
          { value: 'students', label: 'My Students' },
          { value: 'coaches', label: 'Coaches' },
          { value: 'requests', label: 'Requests' },
        ]}
        style={styles.segmented}
      />

      {tab === 'students' && (
        <FlatList
          data={students ?? []}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={!students?.length ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={studentsRefetching} onRefresh={refetchStudents} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <EmptyState icon="account-group" title="No Students" description="No students found" />
          }
        />
      )}

      {tab === 'coaches' && (
        <FlatList
          data={coaches ?? []}
          renderItem={renderCoachItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={!coaches?.length ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={coachesRefetching} onRefresh={refetchCoaches} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <EmptyState icon="account-star" title="No Coaches" description="No coaches found" />
          }
        />
      )}

      {tab === 'requests' && (
        <FlatList
          data={requests ?? []}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={!requests?.length ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={requestsRefetching} onRefresh={refetchRequests} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <EmptyState icon="clipboard-text" title="No Requests" description="You haven't made any lesson requests yet" />
          }
        />
      )}

      <RequestLessonModal
        visible={showRequestModal}
        onDismiss={() => setShowRequestModal(false)}
        initialCoachId={selectedCoachId}
        initialStudentId={selectedStudentId}
      />

      {/* Private lesson payment selector */}
      <PaymentMethodSelector
        visible={showPaymentSelector}
        onDismiss={() => {
          setShowPaymentSelector(false);
          setPayingRequest(null);
        }}
        onSelectStripe={() => { setPaymentContext('request'); handleStripePayment(); }}
        onSelectExternal={() => { setPaymentContext('request'); handleExternalPayment(); }}
      />

      {/* Student picker for package purchase */}
      <Portal>
        <Dialog visible={showStudentPicker} onDismiss={() => setShowStudentPicker(false)}>
          <Dialog.Title>Select Child</Dialog.Title>
          <Dialog.Content>
            {buyingPackage && (
              <Text variant="bodyMedium" style={pkgStyles.confirmText}>
                Buy {buyingPackage.name} ({buyingPackage.num_hours}hrs) from {buyingCoachName} for ${(buyingPackage.price_cents / 100).toFixed(0)}?
              </Text>
            )}
            <Text variant="bodySmall" style={pkgStyles.selectLabel}>Which child is this package for?</Text>
            <RadioButton.Group onValueChange={setSelectedBuyStudentId} value={selectedBuyStudentId}>
              {(students ?? []).map((s) => (
                <RadioButton.Item
                  key={s.id}
                  label={`${s.first_name} ${s.last_name}`}
                  value={s.id}
                  color={COLORS.primary}
                  labelStyle={pkgStyles.radioLabel}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowStudentPicker(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleConfirmStudentForPackage}
              disabled={!selectedBuyStudentId}
              style={pkgStyles.continueButton}
            >
              Continue to Payment
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Package purchase payment selector */}
      <PaymentMethodSelector
        visible={showBuyPaymentSelector}
        onDismiss={() => {
          setShowBuyPaymentSelector(false);
          setBuyingPackage(null);
        }}
        onSelectStripe={handleStripePayment}
        onSelectExternal={handleExternalPayment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  segmented: {
    margin: SPACING.md,
  },
  list: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
  },
});

const pkgStyles = StyleSheet.create({
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
});
