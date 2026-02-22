import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Portal, Dialog, Text } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';

interface PaymentMethodSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onSelectStripe: () => void;
  onSelectExternal: () => void;
  testID?: string;
}

export function PaymentMethodSelector({ visible, onDismiss, onSelectStripe, onSelectExternal, testID }: PaymentMethodSelectorProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} testID={testID}>
        <Dialog.Title>Choose Payment Method</Dialog.Title>
        <Dialog.Content>
          <Button
            mode="contained"
            icon="credit-card"
            onPress={onSelectStripe}
            style={styles.stripeButton}
            contentStyle={styles.buttonContent}
          >
            Pay with Card (Stripe)
          </Button>
          <Text variant="bodySmall" style={styles.orText}>or</Text>
          <Button
            mode="outlined"
            icon="cash"
            onPress={onSelectExternal}
            style={styles.externalButton}
            contentStyle={styles.buttonContent}
          >
            Record External Payment
          </Button>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  stripeButton: {
    backgroundColor: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  buttonContent: {
    height: LAYOUT.buttonHeight,
  },
  orText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.xs,
  },
  externalButton: {
    borderColor: COLORS.primary,
  },
});
