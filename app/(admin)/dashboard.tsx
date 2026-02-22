import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Button, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/lib/stores/authStore';
import { useDashboardStats, useDashboardCoaches } from '@/lib/hooks/useDashboard';
import { useUnreadCount } from '@/lib/hooks/useNotifications';
import { useAuth } from '@/lib/hooks/useAuth';
import { LoadingScreen } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <Card style={styles.statCard}>
      <Card.Content style={styles.statContent}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
        <Text variant="headlineMedium" style={[styles.statValue, { color }]}>{value}</Text>
        <Text variant="bodySmall" style={styles.statLabel}>{label}</Text>
      </Card.Content>
    </Card>
  );
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function AdminDashboard() {
  const userProfile = useAuthStore((s) => s.userProfile);
  const { data: stats, isLoading } = useDashboardStats();
  const { data: coaches } = useDashboardCoaches();
  const { data: unreadCount } = useUnreadCount();
  const { signOut } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Loading dashboard..." testID="dashboard-loading" />;
  }

  return (
    <ScrollView style={styles.container} testID="admin-dashboard">
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={styles.welcome}>
          Welcome, {userProfile?.first_name ?? 'Admin'}!
        </Text>
        <View style={styles.headerIcons}>
          <View style={styles.bellContainer}>
            <IconButton
              icon="bell"
              size={24}
              iconColor={COLORS.textPrimary}
              onPress={() => router.push('/(admin)/notifications')}
              testID="dashboard-bell"
            />
            {(unreadCount ?? 0) > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          <IconButton
            icon="logout"
            size={24}
            iconColor={COLORS.error}
            onPress={signOut}
            testID="dashboard-logout"
          />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="cash-multiple"
          label="Revenue This Month"
          value={formatCents(stats?.revenueThisMonth ?? 0)}
          color={COLORS.primary}
        />
        <StatCard
          icon="account-group"
          label="Group Classes This Month"
          value={stats?.groupClassesThisMonth ?? 0}
          color={COLORS.info}
        />
        <StatCard
          icon="credit-card-check"
          label="Active Memberships"
          value={stats?.activeSubscriptions ?? 0}
          color={COLORS.success}
        />
        <StatCard
          icon="account-multiple"
          label="Active Students"
          value={stats?.totalStudents ?? 0}
          color={COLORS.warning}
        />
      </View>

      {(stats?.expiringSubscriptions ?? 0) > 0 && (
        <Card style={styles.expiryCard} onPress={() => router.push('/(admin)/subscriptions')}>
          <Card.Content style={styles.expiryContent}>
            <MaterialCommunityIcons name="alert" size={24} color={COLORS.warning} />
            <Text variant="bodyMedium" style={styles.expiryText}>
              {stats!.expiringSubscriptions} subscription{stats!.expiringSubscriptions > 1 ? 's' : ''} expiring within 7 days
            </Text>
            <Button mode="text" compact onPress={() => router.push('/(admin)/subscriptions')}>
              View
            </Button>
          </Card.Content>
        </Card>
      )}

      {coaches && coaches.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>My Coaches</Text>
          <View style={styles.coachList}>
            {coaches.map((coach) => (
              <Card key={coach.id} style={styles.coachCard}>
                <Card.Content style={styles.coachContent}>
                  <MaterialCommunityIcons name="account" size={20} color={COLORS.primary} />
                  <Text variant="bodyMedium" style={styles.coachName}>
                    {coach.first_name} {coach.last_name}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        </>
      )}

      <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actions}>
        <Button
          mode="contained"
          icon="school"
          onPress={() => router.push('/(admin)/lessons/create')}
          style={styles.actionButton}
          testID="quick-new-lesson"
        >
          New Lesson Template
        </Button>
        <Button
          mode="contained"
          icon="account-plus"
          onPress={() => router.push('/(admin)/students/create')}
          style={styles.actionButton}
          testID="quick-add-student"
        >
          Add Student
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: SPACING.xs,
  },
  welcome: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
    flex: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
  },
  statCard: {
    width: '47%',
    margin: '1.5%',
    backgroundColor: COLORS.surface,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: SPACING.xs,
  },
  statLabel: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  expiryCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: '#FFF8E1',
  },
  expiryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  expiryText: {
    flex: 1,
    color: COLORS.warning,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  coachList: {
    paddingHorizontal: SPACING.md,
  },
  coachCard: {
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface,
  },
  coachContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  coachName: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  actions: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  actionButton: {
    marginBottom: SPACING.xs,
  },
});
