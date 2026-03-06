import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Button } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { inviteSchema } from '@/lib/validation/invite';
import { useCreateInvite } from '@/lib/hooks/useInvites';
import { useUIStore } from '@/lib/stores/uiStore';
import { SPACING } from '@/constants/theme';

interface InviteCoachDialogProps {
  visible: boolean;
  onDismiss: () => void;
}

export function InviteCoachDialog({ visible, onDismiss }: InviteCoachDialogProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const createInvite = useCreateInvite();
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleSubmit = async () => {
    setError('');
    const result = inviteSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    try {
      await createInvite.mutateAsync(result.data.email);
      showSnackbar('Invite sent', 'success');
      setEmail('');
      onDismiss();
    } catch (err: any) {
      if (err.code === '23505') {
        setError('An invite for this email already exists');
      } else {
        setError(err.message ?? 'Failed to send invite');
      }
    }
  };

  const handleDismiss = () => {
    setEmail('');
    setError('');
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss} testID="invite-coach-dialog">
        <Dialog.Title>Invite Coach</Dialog.Title>
        <Dialog.Content>
          <FormField
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
            testID="invite-email"
          />
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button onPress={handleDismiss}>Cancel</Button>
          <Button
            onPress={handleSubmit}
            loading={createInvite.isPending}
            disabled={createInvite.isPending}
            testID="invite-submit"
          >
            Send Invite
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  actions: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
});
