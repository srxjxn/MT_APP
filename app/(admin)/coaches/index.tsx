import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Text, Button, FAB, Chip, ActivityIndicator } from 'react-native-paper';
import { EmptyState, ConfirmDialog } from '@/components/ui';
import { InviteCoachDialog } from '@/components/team/InviteCoachDialog';
import { useCoaches, useInvites, useRevokeInvite, usePendingUsers, useConfirmUser } from '@/lib/hooks/useInvites';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';

export default function CoachesScreen() {
  const { data: coaches, isLoading: coachesLoading } = useCoaches();
  const { data: invites, isLoading: invitesLoading } = useInvites();
  const { data: pendingUsers, isLoading: pendingLoading } = usePendingUsers();
  const revokeInvite = useRevokeInvite();
  const confirmUser = useConfirmUser();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [inviteDialogVisible, setInviteDialogVisible] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    try {
      await confirmUser.mutateAsync(userId);
      showSnackbar('Coach approved', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to approve coach', 'error');
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokeInvite.mutateAsync(revokeTarget);
      showSnackbar('Invite revoked', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to revoke invite', 'error');
    } finally {
      setRevokeTarget(null);
    }
  };

  const isLoading = coachesLoading || invitesLoading || pendingLoading;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Coaches section */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Coaches</Text>
        {coaches && coaches.length > 0 ? (
          coaches.map((coach) => (
            <Card key={coach.id} style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardInfo}>
                  <Text variant="bodyLarge" style={styles.name}>
                    {coach.first_name} {coach.last_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.email}>{coach.email}</Text>
                </View>
                <Chip
                  style={[styles.statusChip, coach.is_active ? styles.activeChip : styles.inactiveChip]}
                  textStyle={coach.is_active ? styles.activeChipText : styles.inactiveChipText}
                >
                  {coach.is_active ? 'Active' : 'Inactive'}
                </Chip>
              </Card.Content>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="account-group"
            title="No Coaches Yet"
            description="Invite coaches to join your team"
          />
        )}

        {/* Pending Approval section */}
        {pendingUsers && pendingUsers.length > 0 && (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, styles.invitesSection]}>
              Pending Approval
            </Text>
            {pendingUsers.map((user) => (
              <Card key={user.id} style={styles.card}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardInfo}>
                    <Text variant="bodyLarge" style={styles.name}>
                      {user.first_name} {user.last_name}
                    </Text>
                    <Text variant="bodySmall" style={styles.email}>{user.email}</Text>
                    <Text variant="bodySmall" style={styles.email}>
                      Signed up {new Date(user.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Button
                    mode="contained"
                    compact
                    onPress={() => handleApprove(user.id)}
                    loading={confirmUser.isPending}
                  >
                    Approve
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        {/* Pending Invites section */}
        <Text variant="titleMedium" style={[styles.sectionTitle, styles.invitesSection]}>
          Pending Invites
        </Text>
        {invites && invites.length > 0 ? (
          invites.map((invite) => (
            <Card key={invite.id} style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.cardInfo}>
                  <Text variant="bodyLarge" style={styles.name}>{invite.email}</Text>
                  <Text variant="bodySmall" style={styles.email}>
                    Invited {new Date(invite.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  compact
                  textColor={COLORS.error}
                  style={styles.revokeButton}
                  onPress={() => setRevokeTarget(invite.id)}
                >
                  Revoke
                </Button>
              </Card.Content>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="email-outline"
            title="No Pending Invites"
            description="Tap + to invite a coach"
          />
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setInviteDialogVisible(true)}
        testID="invite-coach-fab"
      />

      <InviteCoachDialog
        visible={inviteDialogVisible}
        onDismiss={() => setInviteDialogVisible(false)}
      />

      <ConfirmDialog
        visible={!!revokeTarget}
        title="Revoke Invite"
        message="Are you sure you want to revoke this invite?"
        confirmLabel="Revoke"
        destructive
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 80,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  invitesSection: {
    marginTop: SPACING.lg,
  },
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  name: {
    color: COLORS.textPrimary,
  },
  email: {
    color: COLORS.textSecondary,
    marginTop: 2,
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
  revokeButton: {
    borderColor: COLORS.error,
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    backgroundColor: COLORS.primary,
  },
});
