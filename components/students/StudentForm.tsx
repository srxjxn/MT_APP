import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Menu } from 'react-native-paper';
import { FormField } from '@/components/ui';
import { COLORS, SPACING } from '@/constants/theme';
import { LAYOUT } from '@/constants/layout';
import { studentSchema, StudentFormData, SKILL_LEVELS } from '@/lib/validation/student';
import { UserProfile } from '@/lib/types';

interface StudentFormProps {
  initialValues?: Partial<StudentFormData>;
  parentUsers?: Pick<UserProfile, 'id' | 'first_name' | 'last_name' | 'email'>[];
  showParentPicker?: boolean;
  onSubmit: (data: StudentFormData) => void;
  loading?: boolean;
  submitLabel?: string;
  testID?: string;
}

export function StudentForm({
  initialValues,
  parentUsers,
  showParentPicker = true,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  testID,
}: StudentFormProps) {
  const [firstName, setFirstName] = useState(initialValues?.first_name ?? '');
  const [lastName, setLastName] = useState(initialValues?.last_name ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(initialValues?.date_of_birth ?? '');
  const [skillLevel, setSkillLevel] = useState<string>(initialValues?.skill_level ?? 'beginner');
  const [medicalNotes, setMedicalNotes] = useState(initialValues?.medical_notes ?? '');
  const [parentId, setParentId] = useState(initialValues?.parent_id ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skillMenuVisible, setSkillMenuVisible] = useState(false);
  const [parentMenuVisible, setParentMenuVisible] = useState(false);

  const selectedParent = parentUsers?.find((p) => p.id === parentId);

  const handleSubmit = () => {
    const result = studentSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth || undefined,
      skill_level: skillLevel,
      medical_notes: medicalNotes || undefined,
      parent_id: parentId,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(result.data);
  };

  return (
    <View style={styles.container} testID={testID ?? 'student-form'}>
      <FormField
        label="First Name"
        value={firstName}
        onChangeText={(v) => { setFirstName(v); setErrors((e) => ({ ...e, first_name: '' })); }}
        error={errors.first_name}
        testID="student-first-name-input"
      />

      <FormField
        label="Last Name"
        value={lastName}
        onChangeText={(v) => { setLastName(v); setErrors((e) => ({ ...e, last_name: '' })); }}
        error={errors.last_name}
        testID="student-last-name-input"
      />

      <FormField
        label="Date of Birth (YYYY-MM-DD)"
        value={dateOfBirth}
        onChangeText={(v) => { setDateOfBirth(v); setErrors((e) => ({ ...e, date_of_birth: '' })); }}
        error={errors.date_of_birth}
        testID="student-dob-input"
      />

      <Text variant="titleSmall" style={styles.label}>Skill Level</Text>
      <Menu
        visible={skillMenuVisible}
        onDismiss={() => setSkillMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setSkillMenuVisible(true)}
            style={styles.dropdown}
            contentStyle={styles.dropdownContent}
            testID="student-skill-dropdown"
          >
            {skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}
          </Button>
        }
      >
        {SKILL_LEVELS.map((level) => (
          <Menu.Item
            key={level}
            onPress={() => {
              setSkillLevel(level);
              setSkillMenuVisible(false);
            }}
            title={level.charAt(0).toUpperCase() + level.slice(1)}
          />
        ))}
      </Menu>

      {showParentPicker && (
        <>
          <Text variant="titleSmall" style={styles.label}>Parent</Text>
          <Menu
            visible={parentMenuVisible}
            onDismiss={() => setParentMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setParentMenuVisible(true)}
                style={styles.dropdown}
                contentStyle={styles.dropdownContent}
                testID="student-parent-dropdown"
              >
                {selectedParent
                  ? `${selectedParent.first_name} ${selectedParent.last_name}`
                  : 'Select parent'}
              </Button>
            }
          >
            {parentUsers?.map((parent) => (
              <Menu.Item
                key={parent.id}
                onPress={() => {
                  setParentId(parent.id);
                  setParentMenuVisible(false);
                  setErrors((e) => ({ ...e, parent_id: '' }));
                }}
                title={`${parent.first_name} ${parent.last_name}`}
              />
            ))}
          </Menu>
          {errors.parent_id && (
            <Text variant="bodySmall" style={styles.error}>{errors.parent_id}</Text>
          )}
        </>
      )}

      <FormField
        label="Medical Notes"
        value={medicalNotes}
        onChangeText={setMedicalNotes}
        multiline
        testID="student-medical-input"
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
        contentStyle={styles.submitContent}
        testID="student-submit"
      >
        {submitLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  label: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    color: COLORS.textPrimary,
  },
  dropdown: {
    marginBottom: SPACING.xs,
  },
  dropdownContent: {
    height: LAYOUT.buttonHeight,
  },
  error: {
    color: COLORS.error,
    marginBottom: SPACING.sm,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  submitContent: {
    height: LAYOUT.buttonHeight,
  },
});
