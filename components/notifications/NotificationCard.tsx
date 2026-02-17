import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { Notification } from '@/lib/types';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const CHANNEL_COLORS: Record<string, { bg: string; text: string }> = {
  push: { bg: COLORS.infoLight, text: COLORS.info },
  email: { bg: COLORS.successLight, text: COLORS.success },
  sms: { bg: COLORS.warningLight, text: COLORS.warning },
};

interface NotificationCardProps {
  notification: Notification;
  onPress?: () => void;
  testID?: string;
}

export function NotificationCard({ notification, onPress, testID }: NotificationCardProps) {
  const isUnread = !notification.read_at;
  const channelColor = CHANNEL_COLORS[notification.channel] ?? { bg: '#F5F5F5', text: COLORS.textSecondary };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} testID={testID}>
      <Card style={[styles.card, isUnread && styles.unreadCard]}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {isUnread && <View style={styles.unreadDot} />}
              <Text
                variant="titleSmall"
                style={[styles.title, isUnread && styles.unreadTitle]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.time}>
              {relativeTime(notification.created_at)}
            </Text>
          </View>
          <Text
            variant="bodyMedium"
            style={[styles.body, isUnread && styles.unreadBody]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
          <Chip
            style={[styles.channelChip, { backgroundColor: channelColor.bg }]}
            textStyle={[styles.channelText, { color: channelColor.text }]}
          >
            {notification.channel}
          </Chip>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  time: {
    color: COLORS.textSecondary,
  },
  body: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  unreadBody: {
    color: COLORS.textPrimary,
  },
  channelChip: {
    alignSelf: 'flex-start',
    height: 24,
  },
  channelText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
