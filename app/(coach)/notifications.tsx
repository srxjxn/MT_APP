import React from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Button } from 'react-native-paper';
import { useNotifications, useMarkAsRead, useMarkAllRead, useUnreadCount } from '@/lib/hooks/useNotifications';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { LoadingScreen, EmptyState } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { Notification } from '@/lib/types';

export default function CoachNotifications() {
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllRead = useMarkAllRead();

  const handlePress = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead.mutate(notification.id);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading notifications..." testID="notifications-loading" />;
  }

  return (
    <View style={styles.container} testID="coach-notifications">
      {(unreadCount ?? 0) > 0 && (
        <Button
          mode="text"
          onPress={() => markAllRead.mutate()}
          loading={markAllRead.isPending}
          style={styles.markAllButton}
          testID="mark-all-read"
        >
          Mark All Read ({unreadCount})
        </Button>
      )}
      <FlatList
        data={notifications}
        renderItem={({ item }) => (
          <NotificationCard
            notification={item}
            onPress={() => handlePress(item)}
            testID={`notification-${item.id}`}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bell-off"
            title="No Notifications"
            description="You're all caught up!"
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
  markAllButton: {
    alignSelf: 'flex-end',
    marginRight: SPACING.sm,
    marginTop: SPACING.xs,
  },
  list: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
  },
});
