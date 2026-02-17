import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { useParentStudents } from '@/lib/hooks/useStudents';
import { useCoachDirectory } from '@/lib/hooks/useCoachPricing';
import { useParentLessonRequests, useUpdateLessonRequest, LessonRequestWithJoins } from '@/lib/hooks/useLessonRequests';
import { useStudentPackages, StudentPackageWithDetails } from '@/lib/hooks/useStudentPackages';
import { useStudentPrimaryCoach, useStudentPrivateLessonStats } from '@/lib/hooks/usePrivateLessonStats';
import { StudentPackageCard } from '@/components/private-lessons/StudentPackageCard';
import { CoachPricingCard } from '@/components/private-lessons/CoachPricingCard';
import { LessonRequestCard } from '@/components/private-lessons/LessonRequestCard';
import { RequestLessonModal } from '@/components/private-lessons/RequestLessonModal';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { Student } from '@/lib/types';
import { CoachWithPricing } from '@/lib/hooks/useCoachPricing';

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

export default function PrivateLessonsScreen() {
  const [tab, setTab] = useState<TabValue>('students');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | undefined>();
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>();

  const { data: students, isLoading: studentsLoading, refetch: refetchStudents, isRefetching: studentsRefetching } = useParentStudents();
  const { data: coaches, isLoading: coachesLoading, refetch: refetchCoaches, isRefetching: coachesRefetching } = useCoachDirectory();
  const { data: requests, isLoading: requestsLoading, refetch: refetchRequests, isRefetching: requestsRefetching } = useParentLessonRequests();
  const updateRequest = useUpdateLessonRequest();

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

  const renderStudentItem = useCallback(({ item }: { item: Student }) => (
    <StudentCardWrapper student={item} onRequestLesson={openRequestModal} />
  ), [openRequestModal]);

  const renderCoachItem = useCallback(({ item }: { item: CoachWithPricing }) => (
    <CoachPricingCard
      coach={item}
      onRequestLesson={() => openRequestModal(undefined, item.id)}
    />
  ), [openRequestModal]);

  const renderRequestItem = useCallback(({ item }: { item: LessonRequestWithJoins }) => (
    <LessonRequestCard
      request={item}
      onCancel={() => handleCancelRequest(item.id)}
    />
  ), [handleCancelRequest]);

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
