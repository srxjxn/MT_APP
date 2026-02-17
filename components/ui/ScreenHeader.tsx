import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { COLORS, SPACING, TOUCH_TARGET } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
  testID?: string;
}

export function ScreenHeader({ title, onBack, rightAction, testID }: ScreenHeaderProps) {
  return (
    <View style={styles.container} testID={testID ?? 'screen-header'}>
      {onBack ? (
        <IconButton icon="arrow-left" size={24} onPress={onBack} testID="header-back" />
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text variant="titleLarge" style={styles.title} numberOfLines={1}>{title}</Text>
      {rightAction ? (
        <IconButton icon={rightAction.icon} size={24} onPress={rightAction.onPress} testID="header-right-action" />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    minHeight: TOUCH_TARGET,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
  },
  placeholder: {
    width: TOUCH_TARGET,
  },
});
