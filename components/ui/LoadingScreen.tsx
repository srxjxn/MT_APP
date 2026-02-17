import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';

interface LoadingScreenProps {
  message?: string;
  testID?: string;
}

export function LoadingScreen({ message, testID }: LoadingScreenProps) {
  return (
    <View style={styles.container} testID={testID ?? 'loading-screen'}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  message: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
  },
});
