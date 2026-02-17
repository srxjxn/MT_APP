import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING } from '@/constants/theme';
import { StudentNoteWithJoins } from '@/lib/hooks/useStudentNotes';

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
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface NoteCardProps {
  note: StudentNoteWithJoins;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
  testID?: string;
}

export function NoteCard({ note, canDelete, onDelete, testID }: NoteCardProps) {
  const authorName = note.author
    ? `${note.author.first_name} ${note.author.last_name}`
    : 'Unknown';

  return (
    <Card style={styles.card} testID={testID ?? `note-card-${note.id}`}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="labelLarge" style={styles.author}>{authorName}</Text>
            <Text variant="bodySmall" style={styles.time}>{relativeTime(note.created_at)}</Text>
          </View>
          <View style={styles.headerRight}>
            {note.is_private && (
              <Chip
                icon={() => <MaterialCommunityIcons name="lock" size={14} color={COLORS.warning} />}
                style={styles.privateBadge}
                textStyle={styles.privateBadgeText}
              >
                Private
              </Chip>
            )}
            {canDelete && onDelete && (
              <IconButton
                icon="delete-outline"
                size={18}
                iconColor={COLORS.error}
                onPress={() => onDelete(note.id)}
                testID={`note-delete-${note.id}`}
              />
            )}
          </View>
        </View>
        <Text variant="bodyMedium" style={styles.content}>{note.content}</Text>
        {note.lesson_instance && (
          <Chip
            icon="calendar"
            style={styles.lessonChip}
            textStyle={styles.lessonChipText}
          >
            {note.lesson_instance.date} {note.lesson_instance.start_time}
          </Chip>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
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
    gap: SPACING.sm,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  author: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  time: {
    color: COLORS.textSecondary,
  },
  content: {
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  privateBadge: {
    backgroundColor: COLORS.warningLight,
    height: 28,
  },
  privateBadgeText: {
    fontSize: 11,
    color: COLORS.warning,
  },
  lessonChip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.infoLight,
    marginTop: SPACING.xs,
  },
  lessonChipText: {
    fontSize: 11,
    color: COLORS.info,
  },
});
