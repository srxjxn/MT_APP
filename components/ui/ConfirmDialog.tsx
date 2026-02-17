import React from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Button, Text } from 'react-native-paper';
import { COLORS, SPACING } from '@/constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel} testID={testID ?? 'confirm-dialog'}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} testID="confirm-dialog-cancel">{cancelLabel}</Button>
          <Button
            onPress={onConfirm}
            textColor={destructive ? COLORS.error : COLORS.primary}
            testID="confirm-dialog-confirm"
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
