import React from 'react';
import { Linking, StyleSheet } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';

const PRIVACY_POLICY_URL = 'https://srxjxn.github.io/MT_APP/privacy-policy.html';
const TERMS_OF_SERVICE_URL = 'https://srxjxn.github.io/MT_APP/terms-of-service.html';

export function LegalLinks() {
  return (
    <Card style={styles.card}>
      <Card.Content style={styles.content}>
        <Button
          mode="text"
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          textColor={COLORS.primary}
          testID="legal-privacy-policy"
        >
          Privacy Policy
        </Button>
        <Button
          mode="text"
          onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
          textColor={COLORS.primary}
          testID="legal-terms-of-service"
        >
          Terms of Service
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  content: {
    alignItems: 'center',
  },
});
