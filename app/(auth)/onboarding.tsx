import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  ProgressBar,
  RadioButton,
  Card,
  IconButton,
} from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/hooks/useAuth';
import { useAuthStore } from '@/lib/stores/authStore';
import { FormField, DatePickerField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { useUIStore } from '@/lib/stores/uiStore';
import { MembershipPlan, UserProfile } from '@/lib/types';
import { queryClient } from '@/lib/queryClient';
import { studentKeys } from '@/lib/hooks/useStudents';

const TOTAL_STEPS = 4;

interface ChildEntry {
  firstName: string;
  lastName: string;
  dob: string;
}

const emptyChild = (): ChildEntry => ({ firstName: '', lastName: '', dob: '' });

export default function OnboardingScreen() {
  const { signOut } = useAuth();
  const userProfile = useAuthStore((s) => s.userProfile);
  const setUserProfile = useAuthStore((s) => s.setUserProfile);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);
  const showSnackbar = useUIStore((s) => s.showSnackbar);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Your Info
  const [firstName, setFirstName] = useState(userProfile?.first_name ?? '');
  const [lastName, setLastName] = useState(userProfile?.last_name ?? '');
  const [phone, setPhone] = useState(userProfile?.phone ?? '');

  // Sync form fields when userProfile arrives after initial mount
  useEffect(() => {
    if (userProfile) {
      setFirstName((prev) => prev || userProfile.first_name || '');
      setLastName((prev) => prev || userProfile.last_name || '');
      setPhone((prev) => prev || userProfile.phone || '');
    }
  }, [userProfile]);

  // Step 2 — Children
  const [children, setChildren] = useState<ChildEntry[]>([emptyChild()]);

  // Step 3 — Coach
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);

  // Step 4 — Plan
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.org_id) return;
    // Pre-fetch coaches
    supabase
      .from('users')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .eq('role', 'coach')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setCoaches(data);
      });
    // Pre-fetch plans
    supabase
      .from('membership_plans')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .eq('is_active', true)
      .order('price_cents', { ascending: true })
      .then(({ data }) => {
        if (data) setPlans(data);
      });
  }, [userProfile?.org_id]);

  const updateChild = (index: number, field: keyof ChildEntry, value: string) => {
    setChildren((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addChild = () => setChildren((prev) => [...prev, emptyChild()]);

  const removeChild = (index: number) => {
    setChildren((prev) => prev.filter((_, i) => i !== index));
  };

  const canProceed = (): boolean => {
    if (step === 1) return !!firstName.trim() && !!lastName.trim();
    if (step === 2) {
      return children.some((c) => c.firstName.trim() && c.lastName.trim());
    }
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) {
      if (step === 1) showSnackbar('First and last name are required', 'error');
      if (step === 2) showSnackbar('At least one child with a name is required', 'error');
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleComplete = async () => {
    if (!userProfile) {
      showSnackbar('Profile not loaded yet. Please wait a moment and try again.', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Update parent profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
        })
        .eq('id', userProfile.id);

      if (updateError) throw updateError;

      // 2. Insert children (only those with names filled)
      const validChildren = children.filter(
        (c) => c.firstName.trim() && c.lastName.trim()
      );

      if (validChildren.length > 0) {
        // 1. Insert students (critical — must succeed)
        const { error: childError } = await supabase.from('students').insert(
          validChildren.map((c) => ({
            org_id: userProfile.org_id,
            parent_id: userProfile.id,
            first_name: c.firstName.trim(),
            last_name: c.lastName.trim(),
            date_of_birth: c.dob || null,
            skill_level: 'beginner' as const,
            assigned_coach_id: selectedCoachId,
          }))
        );
        if (childError) throw childError;

        // 2. Seed cache (best-effort — don't block navigation on failure)
        try {
          const { data: insertedStudents } = await supabase
            .from('students')
            .select('*')
            .eq('parent_id', userProfile.id);
          if (insertedStudents && insertedStudents.length > 0) {
            queryClient.setQueryData(
              studentKeys.parentStudents(userProfile.id),
              insertedStudents,
            );
          }
        } catch {
          // Cache seeding failed — home screen will fetch on mount instead
        }
      }

      // 3. If plan selected, create local subscription row
      if (selectedPlanId) {
        const plan = plans.find((p) => p.id === selectedPlanId);
        if (plan) {
          const now = new Date();
          const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          await supabase.from('subscriptions').insert({
            org_id: userProfile.org_id,
            user_id: userProfile.id,
            name: plan.name,
            price_cents: plan.price_cents,
            lessons_per_month: plan.lessons_per_month,
            starts_at: now.toISOString(),
            status: plan.stripe_price_id ? ('pending' as const) : ('active' as const),
            stripe_price_id: plan.stripe_price_id,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
          });
        }
      }

      // 4. Refresh user profile in store
      const { data: refreshed } = await supabase
        .from('users')
        .select('*')
        .eq('id', userProfile.id)
        .single();
      if (refreshed) setUserProfile(refreshed);

      setNeedsOnboarding(false);
      showSnackbar('Welcome to Modern Tennis!', 'success');
    } catch (err: any) {
      showSnackbar(err.message ?? 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text variant="titleLarge" style={styles.stepTitle}>
        Your Information
      </Text>
      <Text variant="bodyMedium" style={styles.stepDesc}>
        Let&apos;s make sure we have the right details for you.
      </Text>
      <FormField
        label="First Name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
        testID="onboarding-first-name"
      />
      <FormField
        label="Last Name"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
        testID="onboarding-last-name"
      />
      <FormField
        label="Email"
        value={userProfile?.email ?? ''}
        onChangeText={() => {}}
        disabled
        testID="onboarding-email"
      />
      <FormField
        label="Phone Number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        testID="onboarding-phone"
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text variant="titleLarge" style={styles.stepTitle}>
        Add Your Children
      </Text>
      <Text variant="bodyMedium" style={styles.stepDesc}>
        Tell us about the kids who&apos;ll be taking lessons.
      </Text>
      {children.map((child, index) => (
        <Card key={index} style={styles.childCard}>
          <Card.Content>
            <View style={styles.childHeader}>
              <Text variant="titleSmall" style={styles.childLabel}>
                Child {index + 1}
              </Text>
              {children.length > 1 && (
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => removeChild(index)}
                  testID={`onboarding-remove-child-${index}`}
                />
              )}
            </View>
            <FormField
              label="First Name"
              value={child.firstName}
              onChangeText={(v) => updateChild(index, 'firstName', v)}
              autoCapitalize="words"
              testID={`onboarding-child-first-${index}`}
            />
            <FormField
              label="Last Name"
              value={child.lastName}
              onChangeText={(v) => updateChild(index, 'lastName', v)}
              autoCapitalize="words"
              testID={`onboarding-child-last-${index}`}
            />
            <DatePickerField
              label="Date of Birth"
              value={child.dob}
              onChange={(v) => updateChild(index, 'dob', v)}
              maximumDate={new Date()}
              testID={`onboarding-child-dob-${index}`}
            />
          </Card.Content>
        </Card>
      ))}
      <Button
        mode="outlined"
        onPress={addChild}
        icon="plus"
        style={styles.addChildBtn}
        testID="onboarding-add-child"
      >
        Add Another Child
      </Button>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text variant="titleLarge" style={styles.stepTitle}>
        Pick a Coach
      </Text>
      <Text variant="bodyMedium" style={styles.stepDesc}>
        Choose a preferred coach, or we&apos;ll match your child automatically.
      </Text>
      <RadioButton.Group
        onValueChange={(v) => setSelectedCoachId(v === 'none' ? null : v)}
        value={selectedCoachId ?? 'none'}
      >
        <TouchableOpacity
          onPress={() => setSelectedCoachId(null)}
          activeOpacity={0.7}
        >
          <View style={styles.radioRow}>
            <RadioButton value="none" />
            <Text variant="bodyLarge" style={styles.radioLabel}>
              No preference
            </Text>
          </View>
        </TouchableOpacity>
        {coaches.map((coach) => (
          <TouchableOpacity
            key={coach.id}
            onPress={() => setSelectedCoachId(coach.id)}
            activeOpacity={0.7}
          >
            <View style={styles.radioRow}>
              <RadioButton value={coach.id} />
              <Text variant="bodyLarge" style={styles.radioLabel}>
                {coach.first_name} {coach.last_name}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </RadioButton.Group>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text variant="titleLarge" style={styles.stepTitle}>
        Choose a Plan
      </Text>
      <Text variant="bodyMedium" style={styles.stepDesc}>
        Select a membership plan or skip for now.
      </Text>
      {plans.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          onPress={() =>
            setSelectedPlanId((prev) => (prev === plan.id ? null : plan.id))
          }
          activeOpacity={0.7}
        >
          <Card
            style={[
              styles.planCard,
              selectedPlanId === plan.id && styles.planCardSelected,
            ]}
          >
            <Card.Content>
              <Text variant="titleMedium" style={styles.planName}>
                {plan.name}
              </Text>
              {plan.description ? (
                <Text variant="bodySmall" style={styles.planDesc}>
                  {plan.description}
                </Text>
              ) : null}
              <Text variant="titleSmall" style={styles.planPrice}>
                ${(plan.price_cents / 100).toFixed(2)}/month
              </Text>
              {plan.lessons_per_month ? (
                <Text variant="bodySmall" style={styles.planLessons}>
                  {plan.lessons_per_month} lessons/month
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
      {plans.length === 0 && (
        <Text variant="bodyMedium" style={styles.noPlanText}>
          No plans available yet. You can skip this step.
        </Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.progressContainer}>
        <Text variant="labelMedium" style={styles.progressLabel}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <ProgressBar
          progress={step / TOTAL_STEPS}
          color={COLORS.primary}
          style={styles.progressBar}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.navRow}>
        {step > 1 ? (
          <Button mode="outlined" onPress={handleBack} style={styles.navBtn}>
            Back
          </Button>
        ) : (
          <Button
            mode="text"
            onPress={signOut}
            style={styles.navBtn}
            testID="onboarding-sign-out"
          >
            Sign Out
          </Button>
        )}

        {step < TOTAL_STEPS ? (
          <Button
            mode="contained"
            onPress={handleNext}
            style={styles.navBtn}
            disabled={!canProceed()}
          >
            Next
          </Button>
        ) : (
          <Button
            mode="contained"
            onPress={handleComplete}
            loading={loading}
            disabled={loading}
            style={styles.navBtn}
          >
            Complete Setup
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: LAYOUT.contentPadding,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  progressLabel: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  scroll: {
    flexGrow: 1,
    padding: LAYOUT.contentPadding,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  stepDesc: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  childCard: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  childHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childLabel: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  addChildBtn: {
    marginTop: SPACING.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  radioLabel: {
    color: COLORS.textPrimary,
    flex: 1,
  },
  planCard: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: COLORS.primary,
  },
  planName: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  planDesc: {
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  planPrice: {
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  planLessons: {
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noPlanText: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.contentPadding,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  navBtn: {
    minWidth: 120,
  },
});
