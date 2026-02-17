import React, { useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Button, FAB, Portal, Modal, Text } from 'react-native-paper';
import { useNotifications, useMarkAsRead, useMarkAllRead, useUnreadCount, useCreateNotification } from '@/lib/hooks/useNotifications';
import { useParentUsers } from '@/lib/hooks/useStudents';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { LoadingScreen, EmptyState, FormField } from '@/components/ui';
import { useUIStore } from '@/lib/stores/uiStore';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { Notification } from '@/lib/types';
import { Menu } from 'react-native-paper';

export default function AdminNotifications() {
  const { data: notifications, isLoading, refetch, isRefetching } = useNotifications();
  const { data: unreadCount } = useUnreadCount();
  const { data: parentUsers } = useParentUsers();
  const markAsRead = useMarkAsRead();
  const markAllRead = useMarkAllRead();
  const createNotification = useCreateNotification();
  const showSnackbar = useUIStore((s) => s.showSnackbar);
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [userId, setUserId] = useState('');
  const [userMenuVisible, setUserMenuVisible] = useState(false);

  const handlePress = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead.mutate(notification.id);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim() || !userId) {
      showSnackbar('Please fill all fields', 'error');
      return;
    }
    try {
      await createNotification.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        user_id: userId,
      });
      showSnackbar('Notification sent', 'success');
      setShowCompose(false);
      setTitle('');
      setBody('');
      setUserId('');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to send notification', 'error');
    }
  };

  const selectedUser = parentUsers?.find((u) => u.id === userId);

  if (isLoading) {
    return <LoadingScreen message="Loading notifications..." testID="notifications-loading" />;
  }

  return (
    <View style={styles.container} testID="admin-notifications">
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

      <FAB
        icon="send"
        style={styles.fab}
        onPress={() => setShowCompose(true)}
        testID="send-notification-fab"
      />

      <Portal>
        <Modal
          visible={showCompose}
          onDismiss={() => setShowCompose(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Send Notification</Text>
          <View style={styles.form}>
            <Text variant="titleSmall" style={styles.label}>Recipient</Text>
            <Menu
              visible={userMenuVisible}
              onDismiss={() => setUserMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setUserMenuVisible(true)}
                  style={styles.dropdown}
                  testID="notification-user-picker"
                >
                  {selectedUser
                    ? `${selectedUser.first_name} ${selectedUser.last_name}`
                    : 'Select user'}
                </Button>
              }
            >
              {parentUsers?.map((user) => (
                <Menu.Item
                  key={user.id}
                  onPress={() => {
                    setUserId(user.id);
                    setUserMenuVisible(false);
                  }}
                  title={`${user.first_name} ${user.last_name}`}
                />
              ))}
            </Menu>

            <FormField
              label="Title"
              value={title}
              onChangeText={setTitle}
              testID="notification-title-input"
            />
            <FormField
              label="Message"
              value={body}
              onChangeText={setBody}
              multiline
              testID="notification-body-input"
            />
            <Button
              mode="contained"
              onPress={handleSend}
              loading={createNotification.isPending}
              disabled={createNotification.isPending}
              style={styles.sendButton}
              contentStyle={styles.sendContent}
              testID="send-notification-button"
            >
              Send
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
  markAllButton: {
    alignSelf: 'flex-end',
    marginRight: SPACING.sm,
    marginTop: SPACING.xs,
  },
  list: {
    padding: SPACING.md,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: SPACING.md,
    bottom: SPACING.md,
    backgroundColor: COLORS.primary,
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
  form: {
    padding: SPACING.md,
  },
  label: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  dropdown: {
    marginBottom: SPACING.sm,
  },
  sendButton: {
    marginTop: SPACING.md,
  },
  sendContent: {
    height: LAYOUT.buttonHeight,
  },
});
