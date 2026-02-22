export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      coach_packages: {
        Row: {
          id: string
          org_id: string
          coach_id: string
          name: string
          num_hours: number
          price_cents: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          coach_id: string
          name: string
          num_hours: number
          price_cents: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          coach_id?: string
          name?: string
          num_hours?: number
          price_cents?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_packages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_packages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_payouts: {
        Row: {
          id: string
          org_id: string
          coach_id: string
          period_start: string
          period_end: string
          group_hours: number
          private_hours: number
          group_rate_cents: number
          private_rate_cents: number
          total_cents: number
          status: Database["public"]["Enums"]["payout_status"]
          notes: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          coach_id: string
          period_start: string
          period_end: string
          group_hours?: number
          private_hours?: number
          group_rate_cents?: number
          private_rate_cents?: number
          total_cents?: number
          status?: Database["public"]["Enums"]["payout_status"]
          notes?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          coach_id?: string
          period_start?: string
          period_end?: string
          group_hours?: number
          private_hours?: number
          group_rate_cents?: number
          private_rate_cents?: number
          total_cents?: number
          status?: Database["public"]["Enums"]["payout_status"]
          notes?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_payouts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_payouts_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_availability: {
        Row: {
          coach_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_recurring: boolean
          org_id: string
          specific_date: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_recurring?: boolean
          org_id: string
          specific_date?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_recurring?: boolean
          org_id?: string
          specific_date?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_availability_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          created_at: string
          id: string
          is_indoor: boolean
          name: string
          notes: string | null
          org_id: string
          status: Database["public"]["Enums"]["court_status"]
          surface_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_indoor?: boolean
          name: string
          notes?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["court_status"]
          surface_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_indoor?: boolean
          name?: string
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["court_status"]
          surface_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          attended: boolean | null
          checked_in_at: string | null
          created_at: string
          id: string
          lesson_instance_id: string
          notes: string | null
          org_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          attended?: boolean | null
          checked_in_at?: string | null
          created_at?: string
          id?: string
          lesson_instance_id: string
          notes?: string | null
          org_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          attended?: boolean | null
          checked_in_at?: string | null
          created_at?: string
          id?: string
          lesson_instance_id?: string
          notes?: string | null
          org_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_lesson_instance_id_fkey"
            columns: ["lesson_instance_id"]
            isOneToOne: false
            referencedRelation: "lesson_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_instances: {
        Row: {
          coach_id: string
          court_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string | null
          org_id: string
          start_time: string
          status: Database["public"]["Enums"]["lesson_status"]
          template_id: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          court_id?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          notes?: string | null
          org_id: string
          start_time: string
          status?: Database["public"]["Enums"]["lesson_status"]
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          court_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          org_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_instances_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_instances_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_instances_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "lesson_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_requests: {
        Row: {
          id: string
          org_id: string
          student_id: string
          coach_id: string
          requested_by: string
          preferred_date: string
          preferred_time: string
          status: Database["public"]["Enums"]["lesson_request_status"]
          admin_notes: string | null
          lesson_instance_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          student_id: string
          coach_id: string
          requested_by: string
          preferred_date: string
          preferred_time: string
          status?: Database["public"]["Enums"]["lesson_request_status"]
          admin_notes?: string | null
          lesson_instance_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          student_id?: string
          coach_id?: string
          requested_by?: string
          preferred_date?: string
          preferred_time?: string
          status?: Database["public"]["Enums"]["lesson_request_status"]
          admin_notes?: string | null
          lesson_instance_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_requests_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_requests_lesson_instance_id_fkey"
            columns: ["lesson_instance_id"]
            isOneToOne: false
            referencedRelation: "lesson_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_templates: {
        Row: {
          coach_id: string
          court_id: string | null
          created_at: string
          day_of_week: number
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          max_students: number
          name: string
          org_id: string
          price_cents: number
          start_time: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          court_id?: string | null
          created_at?: string
          day_of_week: number
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          max_students?: number
          name: string
          org_id: string
          price_cents?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          court_id?: string | null
          created_at?: string
          day_of_week?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          max_students?: number
          name?: string
          org_id?: string
          price_cents?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_templates_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_templates_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          data: Json
          id: string
          org_id: string
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          data?: Json
          id?: string
          org_id: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          data?: Json
          id?: string
          org_id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          settings: Json
          slug: string
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          settings?: Json
          slug: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          settings?: Json
          slug?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          external_id: string | null
          id: string
          org_id: string
          paid_at: string | null
          payment_platform:
            | Database["public"]["Enums"]["payment_platform"]
            | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          org_id: string
          paid_at?: string | null
          payment_platform?:
            | Database["public"]["Enums"]["payment_platform"]
            | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          external_id?: string | null
          id?: string
          org_id?: string
          paid_at?: string | null
          payment_platform?:
            | Database["public"]["Enums"]["payment_platform"]
            | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_private: boolean
          lesson_instance_id: string | null
          org_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_private?: boolean
          lesson_instance_id?: string | null
          org_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_private?: boolean
          lesson_instance_id?: string | null
          org_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_lesson_instance_id_fkey"
            columns: ["lesson_instance_id"]
            isOneToOne: false
            referencedRelation: "lesson_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          medical_notes: string | null
          org_id: string
          parent_id: string
          skill_level: Database["public"]["Enums"]["skill_level"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          medical_notes?: string | null
          org_id: string
          parent_id: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          medical_notes?: string | null
          org_id?: string
          parent_id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_packages: {
        Row: {
          id: string
          org_id: string
          student_id: string
          coach_package_id: string
          hours_purchased: number
          hours_used: number
          status: Database["public"]["Enums"]["package_status"]
          needs_billing: boolean
          billed_at: string | null
          purchased_at: string
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          student_id: string
          coach_package_id: string
          hours_purchased: number
          hours_used?: number
          status?: Database["public"]["Enums"]["package_status"]
          needs_billing?: boolean
          billed_at?: string | null
          purchased_at?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          student_id?: string
          coach_package_id?: string
          hours_purchased?: number
          hours_used?: number
          status?: Database["public"]["Enums"]["package_status"]
          needs_billing?: boolean
          billed_at?: string | null
          purchased_at?: string
          expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_packages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_packages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_packages_coach_package_id_fkey"
            columns: ["coach_package_id"]
            isOneToOne: false
            referencedRelation: "coach_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          lessons_per_month: number | null
          name: string
          org_id: string
          price_cents: number
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          lessons_per_month?: number | null
          name: string
          org_id: string
          price_cents?: number
          starts_at: string
          status?: Database["public"]["Enums"]["subscription_status"]
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          lessons_per_month?: number | null
          name?: string
          org_id?: string
          price_cents?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string
          avatar_url: string | null
          created_at: string
          drop_in_rate_cents: number | null
          email: string
          first_name: string
          group_rate_cents: number | null
          id: string
          is_active: boolean
          last_name: string
          org_id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          settings: Json
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          auth_id: string
          avatar_url?: string | null
          created_at?: string
          drop_in_rate_cents?: number | null
          email: string
          first_name: string
          group_rate_cents?: number | null
          id?: string
          is_active?: boolean
          last_name: string
          org_id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          settings?: Json
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          auth_id?: string
          avatar_url?: string | null
          created_at?: string
          drop_in_rate_cents?: number | null
          email?: string
          first_name?: string
          group_rate_cents?: number | null
          id?: string
          is_active?: boolean
          last_name?: string
          org_id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          settings?: Json
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id: { Args: never; Returns: string }
      get_user_org_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      court_status: "active" | "maintenance" | "inactive"
      enrollment_status: "enrolled" | "waitlisted" | "dropped" | "completed"
      lesson_request_status: "pending" | "approved" | "declined" | "cancelled"
      lesson_status: "scheduled" | "in_progress" | "completed" | "cancelled"
      lesson_type: "group" | "private" | "semi_private" | "camp"
      package_status: "active" | "exhausted" | "expired" | "cancelled"
      notification_channel: "push" | "email" | "sms"
      notification_status: "pending" | "sent" | "failed" | "read"
      payout_status: "draft" | "approved" | "paid"
      payment_platform: "stripe" | "square" | "cash" | "check" | "other"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      payment_type: "lesson" | "subscription" | "drop_in" | "other"
      skill_level: "beginner" | "intermediate" | "advanced" | "elite"
      subscription_status: "active" | "paused" | "cancelled" | "expired"
      user_role: "owner" | "admin" | "coach" | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      court_status: ["active", "maintenance", "inactive"],
      enrollment_status: ["enrolled", "waitlisted", "dropped", "completed"],
      lesson_request_status: ["pending", "approved", "declined", "cancelled"],
      lesson_status: ["scheduled", "in_progress", "completed", "cancelled"],
      lesson_type: ["group", "private", "semi_private", "camp"],
      package_status: ["active", "exhausted", "expired", "cancelled"],
      notification_channel: ["push", "email", "sms"],
      notification_status: ["pending", "sent", "failed", "read"],
      payout_status: ["draft", "approved", "paid"],
      payment_platform: ["stripe", "square", "cash", "check", "other"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      payment_type: ["lesson", "subscription", "drop_in", "other"],
      skill_level: ["beginner", "intermediate", "advanced", "elite"],
      subscription_status: ["active", "paused", "cancelled", "expired"],
      user_role: ["owner", "admin", "coach", "parent"],
    },
  },
} as const

