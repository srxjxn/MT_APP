import { Database } from './database.types';
import { Session, User } from '@supabase/supabase-js';

// Table row types
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert'];
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update'];

export type UserProfile = Database['public']['Tables']['users']['Row'];
export type UserProfileInsert = Database['public']['Tables']['users']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['users']['Update'];

export type Student = Database['public']['Tables']['students']['Row'];
export type StudentInsert = Database['public']['Tables']['students']['Insert'];
export type StudentUpdate = Database['public']['Tables']['students']['Update'];

export type Court = Database['public']['Tables']['courts']['Row'];
export type CourtInsert = Database['public']['Tables']['courts']['Insert'];
export type CourtUpdate = Database['public']['Tables']['courts']['Update'];

export type LessonTemplate = Database['public']['Tables']['lesson_templates']['Row'];
export type LessonTemplateInsert = Database['public']['Tables']['lesson_templates']['Insert'];
export type LessonTemplateUpdate = Database['public']['Tables']['lesson_templates']['Update'];

export type LessonInstance = Database['public']['Tables']['lesson_instances']['Row'];
export type LessonInstanceInsert = Database['public']['Tables']['lesson_instances']['Insert'];
export type LessonInstanceUpdate = Database['public']['Tables']['lesson_instances']['Update'];

export type CoachAvailability = Database['public']['Tables']['coach_availability']['Row'];
export type CoachAvailabilityInsert = Database['public']['Tables']['coach_availability']['Insert'];
export type CoachAvailabilityUpdate = Database['public']['Tables']['coach_availability']['Update'];

export type Enrollment = Database['public']['Tables']['enrollments']['Row'];
export type EnrollmentInsert = Database['public']['Tables']['enrollments']['Insert'];
export type EnrollmentUpdate = Database['public']['Tables']['enrollments']['Update'];

export type StudentNote = Database['public']['Tables']['student_notes']['Row'];
export type StudentNoteInsert = Database['public']['Tables']['student_notes']['Insert'];
export type StudentNoteUpdate = Database['public']['Tables']['student_notes']['Update'];

export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type CoachPackage = Database['public']['Tables']['coach_packages']['Row'];
export type CoachPackageInsert = Database['public']['Tables']['coach_packages']['Insert'];
export type CoachPackageUpdate = Database['public']['Tables']['coach_packages']['Update'];

export type StudentPackage = Database['public']['Tables']['student_packages']['Row'];
export type StudentPackageInsert = Database['public']['Tables']['student_packages']['Insert'];
export type StudentPackageUpdate = Database['public']['Tables']['student_packages']['Update'];

export type LessonRequest = Database['public']['Tables']['lesson_requests']['Row'];
export type LessonRequestInsert = Database['public']['Tables']['lesson_requests']['Insert'];
export type LessonRequestUpdate = Database['public']['Tables']['lesson_requests']['Update'];

// Enum types
export type UserRole = Database['public']['Enums']['user_role'];
export type SkillLevel = Database['public']['Enums']['skill_level'];
export type CourtStatus = Database['public']['Enums']['court_status'];
export type LessonType = Database['public']['Enums']['lesson_type'];
export type LessonStatus = Database['public']['Enums']['lesson_status'];
export type EnrollmentStatus = Database['public']['Enums']['enrollment_status'];
export type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
export type PaymentType = Database['public']['Enums']['payment_type'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type PaymentPlatform = Database['public']['Enums']['payment_platform'];
export type NotificationChannel = Database['public']['Enums']['notification_channel'];
export type NotificationStatus = Database['public']['Enums']['notification_status'];
export type LessonRequestStatus = Database['public']['Enums']['lesson_request_status'];
export type PackageStatus = Database['public']['Enums']['package_status'];

// Auth state
export interface AuthState {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;
}

export type { Database };
