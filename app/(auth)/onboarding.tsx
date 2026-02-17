import React, { useState } from 'react';
import { View, StyleSheet, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { Text, Button, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/stores/authStore';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { useUIStore } from '@/lib/stores/uiStore';
import { SkillLevel } from '@/lib/types';

export default function OnboardingScreen() {
  const [childName, setChildName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [loading, setLoading] = useState(false);
  const userProfile = useAuthStore((s) => s.userProfile);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const handleAddChild = async () => {
    if (!childName || !childLastName) {
      showSnackbar('Please enter the child\'s name', 'error');
      return;
    }

    if (!userProfile) {
      showSnackbar('User not found', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('students').insert({
        org_id: userProfile.org_id,
        parent_id: userProfile.id,
        first_name: childName,
        last_name: childLastName,
        date_of_birth: dateOfBirth || null,
        skill_level: skillLevel,
      });

      if (error) throw error;
      showSnackbar('Student added successfully', 'success');
      router.replace('/(parent)/home');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Failed to add student', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(parent)/home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title} testID="onboarding-title">
            Add Your Child
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Let's get your child set up for tennis lessons
          </Text>
        </View>

        <View style={styles.form}>
          <FormField
            label="First Name"
            value={childName}
            onChangeText={setChildName}
            autoCapitalize="words"
            testID="onboarding-child-first-name"
          />
          <FormField
            label="Last Name"
            value={childLastName}
            onChangeText={setChildLastName}
            autoCapitalize="words"
            testID="onboarding-child-last-name"
          />
          <FormField
            label="Date of Birth (YYYY-MM-DD)"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            keyboardType="numeric"
            testID="onboarding-child-dob"
          />

          <Text variant="titleSmall" style={styles.label}>Skill Level</Text>
          <SegmentedButtons
            value={skillLevel}
            onValueChange={(value) => setSkillLevel(value as SkillLevel)}
            buttons={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Inter.' },
              { value: 'advanced', label: 'Adv.' },
              { value: 'elite', label: 'Elite' },
            ]}
            style={styles.segmented}
          />

          <Button
            mode="contained"
            onPress={handleAddChild}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            testID="onboarding-submit"
          >
            Add Child & Continue
          </Button>

          <Button
            mode="text"
            onPress={handleSkip}
            style={styles.skipButton}
            testID="onboarding-skip"
          >
            Skip for now
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: LAYOUT.contentPadding,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  form: {
    marginBottom: SPACING.lg,
  },
  label: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
  },
  segmented: {
    marginBottom: SPACING.md,
  },
  button: {
    marginTop: SPACING.lg,
  },
  buttonContent: {
    height: LAYOUT.buttonHeight,
  },
  skipButton: {
    marginTop: SPACING.sm,
  },
});
