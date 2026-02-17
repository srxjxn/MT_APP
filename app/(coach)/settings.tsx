import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Card, Text, Button, Divider } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';

export default function CoachSettingsScreen() {
  const { signOut } = useAuth();
  const userProfile = useAuthStore((s) => s.userProfile);
  const setUserProfile = useAuthStore((s) => s.setUserProfile);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(userProfile?.first_name ?? '');
  const [lastName, setLastName] = useState(userProfile?.last_name ?? '');
  const [phone, setPhone] = useState(userProfile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ first_name: firstName, last_name: lastName, phone: phone || null })
        .eq('id', userProfile!.id)
        .select()
        .single();

      if (error) throw error;
      setUserProfile(data);
      showSnackbar('Profile updated', 'success');
      setEditing(false);
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} testID="coach-settings-screen">
      <Card style={styles.profileCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>Profile</Text>

          {editing ? (
            <>
              <FormField
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                testID="settings-first-name"
              />
              <FormField
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                testID="settings-last-name"
              />
              <FormField
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                testID="settings-phone"
              />
              <View style={styles.editActions}>
                <Button mode="outlined" onPress={() => setEditing(false)} style={styles.editButton}>
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={saving}
                  disabled={saving}
                  style={styles.editButton}
                  testID="settings-save"
                >
                  Save
                </Button>
              </View>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text variant="bodySmall" style={styles.fieldLabel}>Name</Text>
                <Text variant="bodyLarge" style={styles.fieldValue}>
                  {userProfile?.first_name} {userProfile?.last_name}
                </Text>
              </View>
              <View style={styles.field}>
                <Text variant="bodySmall" style={styles.fieldLabel}>Email</Text>
                <Text variant="bodyLarge" style={styles.fieldValue}>{userProfile?.email}</Text>
              </View>
              <View style={styles.field}>
                <Text variant="bodySmall" style={styles.fieldLabel}>Phone</Text>
                <Text variant="bodyLarge" style={styles.fieldValue}>
                  {userProfile?.phone || 'Not set'}
                </Text>
              </View>
              <Button
                mode="contained-tonal"
                onPress={() => setEditing(true)}
                style={styles.editProfileButton}
                testID="settings-edit-profile"
              >
                Edit Profile
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      <Divider style={styles.divider} />

      <Button
        mode="outlined"
        onPress={signOut}
        style={styles.signOutButton}
        contentStyle={styles.signOutContent}
        textColor={COLORS.error}
        testID="settings-logout"
      >
        Sign Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  field: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  fieldValue: {
    color: COLORS.textPrimary,
  },
  editProfileButton: {
    marginTop: SPACING.sm,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  editButton: {
    minWidth: 100,
  },
  divider: {
    marginHorizontal: SPACING.md,
  },
  signOutButton: {
    margin: SPACING.md,
    borderColor: COLORS.error,
  },
  signOutContent: {
    height: LAYOUT.buttonHeight,
  },
});
