import React, { useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { LessonInstanceWithJoins } from '@/lib/hooks/useLessonInstances';
import { COLORS, SPACING } from '@/constants/theme';

interface DayCalendarViewProps {
  instances: LessonInstanceWithJoins[];
  date: string;
  onDateChange: (date: string) => void;
  onInstancePress: (instance: LessonInstanceWithJoins) => void;
}

const HOUR_HEIGHT = 80;
const START_HOUR = 6;
const END_HOUR = 22;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const LABEL_WIDTH = 50;

const LESSON_TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  group: { bg: '#C8E6C9', border: COLORS.primary },
  private: { bg: COLORS.infoLight, border: COLORS.info },
  semi_private: { bg: COLORS.warningLight, border: COLORS.warning },
  camp: { bg: '#F3E5F5', border: '#9C27B0' },
};

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function DayCalendarView({ instances, date, onDateChange, onInstancePress }: DayCalendarViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const isToday = date === todayStr();

  useEffect(() => {
    // Auto-scroll to 8 AM on mount
    const offset = (8 - START_HOUR) * HOUR_HEIGHT;
    scrollRef.current?.scrollTo({ y: offset, animated: false });
  }, []);

  const dayInstances = instances.filter((inst) => inst.date === date);

  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  // Current time indicator
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeTop = ((currentMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showCurrentTime = isToday && currentMinutes >= START_HOUR * 60 && currentMinutes <= END_HOUR * 60;

  return (
    <View style={styles.container}>
      <View style={styles.navHeader}>
        <IconButton icon="chevron-left" onPress={() => onDateChange(addDays(date, -1))} />
        <Text variant="titleMedium" style={styles.dateText}>{formatDateDisplay(date)}</Text>
        <IconButton icon="chevron-right" onPress={() => onDateChange(addDays(date, 1))} />
        {!isToday && (
          <Button mode="text" compact onPress={() => onDateChange(todayStr())}>
            Today
          </Button>
        )}
      </View>

      <ScrollView ref={scrollRef} style={styles.timeline} contentContainerStyle={{ height: totalHeight }}>
        {/* Hour grid lines and labels */}
        {HOURS.map((hour) => {
          const top = (hour - START_HOUR) * HOUR_HEIGHT;
          return (
            <View key={hour} style={[styles.hourRow, { top }]} pointerEvents="none">
              <Text variant="bodySmall" style={styles.hourLabel}>{formatHour(hour)}</Text>
              <View style={styles.hourLine} />
            </View>
          );
        })}

        {/* Lesson blocks */}
        {dayInstances.map((inst) => {
          const startMin = timeToMinutes(inst.start_time);
          const endMin = timeToMinutes(inst.end_time);
          const top = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
          const height = ((endMin - startMin) / 60) * HOUR_HEIGHT;
          const lessonType = inst.template?.lesson_type ?? 'group';
          const colors = LESSON_TYPE_COLORS[lessonType] ?? LESSON_TYPE_COLORS.group;

          return (
            <TouchableOpacity
              key={inst.id}
              style={[
                styles.lessonBlock,
                {
                  top,
                  height: Math.max(height, 30),
                  backgroundColor: colors.bg,
                  borderLeftColor: colors.border,
                },
              ]}
              onPress={() => onInstancePress(inst)}
              activeOpacity={0.7}
            >
              <Text variant="labelMedium" style={styles.lessonName} numberOfLines={1}>
                {inst.template?.name ?? 'Lesson'}
              </Text>
              <Text variant="bodySmall" style={styles.lessonTime}>
                {inst.start_time} - {inst.end_time}
              </Text>
              {inst.coach && (
                <Text variant="bodySmall" style={styles.lessonCoach} numberOfLines={1}>
                  {inst.coach.first_name} {inst.coach.last_name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Current time indicator */}
        {showCurrentTime && (
          <View style={[styles.currentTimeLine, { top: currentTimeTop }]} pointerEvents="none">
            <View style={styles.currentTimeDot} />
            <View style={styles.currentTimeBar} />
          </View>
        )}

        {/* Empty state */}
        {dayInstances.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={styles.emptyText}>No lessons scheduled</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  dateText: {
    color: COLORS.textPrimary,
    minWidth: 140,
    textAlign: 'center',
  },
  timeline: {
    flex: 1,
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourLabel: {
    width: LABEL_WIDTH,
    textAlign: 'right',
    paddingRight: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: -7,
  },
  hourLine: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  lessonBlock: {
    position: 'absolute',
    left: LABEL_WIDTH + SPACING.xs,
    right: SPACING.sm,
    borderLeftWidth: 4,
    borderRadius: 4,
    padding: SPACING.xs,
    overflow: 'hidden',
  },
  lessonName: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  lessonTime: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  lessonCoach: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  currentTimeLine: {
    position: 'absolute',
    left: LABEL_WIDTH - 4,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  currentTimeBar: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.error,
  },
  emptyState: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
  },
});
