export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  api: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      admin_organizations: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          slug: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      anthropometry_patients: {
        Row: {
          first_name: string | null
          id: string | null
          last_name: string | null
          organization_id: string | null
        }
        Insert: {
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          organization_id?: string | null
        }
        Update: {
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_income_summary: {
        Row: {
          collected_amount: number | null
          currency: string | null
          nutritionist_user_id: string | null
          organization_id: string | null
          payment_count: number | null
          refunded_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          billing_disposition: string | null
          created_at: string | null
          currency: string | null
          duration_minutes: number | null
          ends_at: string | null
          google_calendar_conflict_detected_at: string | null
          id: string | null
          modality: string | null
          nutritionist_user_id: string | null
          organization_id: string | null
          patient_id: string | null
          payment_status: string | null
          quoted_amount: number | null
          starts_at: string | null
          status: string | null
          time_zone: string | null
          total_paid: number | null
          updated_at: string | null
          virtual_meeting_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["organization_id", "patient_id"]
          },
        ]
      }
      attention_inbox: {
        Row: {
          acknowledged_at: string | null
          adherence: number | null
          alert_matches: Json | null
          created_at: string | null
          energy: number | null
          help_requested: boolean | null
          id: string | null
          notes: string | null
          organization_id: string | null
          patient_first_name: string | null
          patient_id: string | null
          patient_last_name: string | null
          priority: string | null
          question_answers: Json | null
          questions: Json | null
          recommended_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          response_id: string | null
          rule_code: string | null
          status: string | null
        }
        Relationships: []
      }
      check_in_assignments: {
        Row: {
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          organization_id: string | null
          patient_id: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          organization_id?: string | null
          patient_id?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          organization_id?: string | null
          patient_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_checkin_assignments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_checkin_assignments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_checkin_assignments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_checkin_assignments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_checkin_assignments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["organization_id", "patient_id"]
          },
        ]
      }
      clinical_patient_profiles: {
        Row: {
          birth_date: string | null
          city: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          organization_id: string | null
          phone: string | null
          status: string | null
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string | null
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_library: {
        Row: {
          body: Json | null
          category: string | null
          created_at: string | null
          id: string | null
          kind: string | null
          organization_id: string | null
          owner_user_id: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          body?: Json | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          kind?: string | null
          organization_id?: string | null
          owner_user_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: Json | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          kind?: string | null
          organization_id?: string | null
          owner_user_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_library_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      current_organizations: {
        Row: {
          created_at: string | null
          id: string | null
          my_role: string | null
          name: string | null
          slug: string | null
          status: string | null
        }
        Relationships: []
      }
      current_profile: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_checkin_settings: {
        Row: {
          fields: string[] | null
          organization_id: string | null
          owner_user_id: string | null
        }
        Insert: {
          fields?: string[] | null
          organization_id?: string | null
          owner_user_id?: string | null
        }
        Update: {
          fields?: string[] | null
          organization_id?: string | null
          owner_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkin_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checkin_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          adherence: number | null
          alert_matches: Json | null
          answers: Json | null
          created_at: string | null
          daily_fields: string[] | null
          due_date: string | null
          energy: number | null
          help_requested: boolean | null
          id: string | null
          notes: string | null
          patient_id: string | null
          question_answers: Json | null
          questions: Json | null
          status: string | null
          submitted_at: string | null
        }
        Relationships: []
      }
      daily_lists: {
        Row: {
          active: boolean | null
          deleted: boolean | null
          duration_days: number | null
          id: string | null
          items: Json | null
          organization_id: string | null
          owner_user_id: string | null
          patient_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          deleted?: boolean | null
          duration_days?: number | null
          id?: string | null
          items?: Json | null
          organization_id?: string | null
          owner_user_id?: string | null
          patient_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          deleted?: boolean | null
          duration_days?: number | null
          id?: string | null
          items?: Json | null
          organization_id?: string | null
          owner_user_id?: string | null
          patient_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lists_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lists_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lists_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lists_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_lists_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      daily_patients: {
        Row: {
          first_name: string | null
          id: string | null
          last_at: string | null
          last_name: string | null
          organization_id: string | null
          source: string | null
          tracking_since: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_phrase_assignments: {
        Row: {
          patient_id: string | null
          phrase_id: string | null
        }
        Insert: {
          patient_id?: string | null
          phrase_id?: string | null
        }
        Update: {
          patient_id?: string | null
          phrase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_phrase_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_phrase_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_phrase_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "daily_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_phrase_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patient_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_phrase_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patient_portal_home"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "daily_phrase_assignments_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "daily_phrases"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_phrases: {
        Row: {
          deleted: boolean | null
          id: string | null
          organization_id: string | null
          owner_user_id: string | null
          text: string | null
          updated_at: string | null
        }
        Insert: {
          deleted?: boolean | null
          id?: string | null
          organization_id?: string | null
          owner_user_id?: string | null
          text?: string | null
          updated_at?: string | null
        }
        Update: {
          deleted?: boolean | null
          id?: string | null
          organization_id?: string | null
          owner_user_id?: string | null
          text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_phrases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_phrases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_task_activity: {
        Row: {
          comment: string | null
          completed: boolean | null
          list_id: string | null
          patient_id: string | null
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          completed?: boolean | null
          list_id?: string | null
          patient_id?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          completed?: boolean | null
          list_id?: string | null
          patient_id?: string | null
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_task_activity_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "daily_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_activity_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_activity_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_activity_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_activity_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_task_activity_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      daily_weights: {
        Row: {
          created_at: string | null
          id: string | null
          origin: string | null
          patient_id: string | null
          recorded_by: string | null
          recorded_on: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          origin?: string | null
          patient_id?: string | null
          recorded_by?: string | null
          recorded_on?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          origin?: string | null
          patient_id?: string | null
          recorded_by?: string | null
          recorded_on?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_weights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_weights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_weights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_weights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_weights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      income_movements: {
        Row: {
          amount: number | null
          appointment_id: string | null
          correction_count: number | null
          currency: string | null
          id: string | null
          method: string | null
          movement_kind: string | null
          note: string | null
          occurred_at: string | null
          original_amount: number | null
          refunded_payment_id: string | null
          revision_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_payment_movements_refunded_payment_id_fkey"
            columns: ["refunded_payment_id"]
            isOneToOne: false
            referencedRelation: "income_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_meal_activity: {
        Row: {
          adherence_status: string | null
          assignment_id: string | null
          comment_updated_at: string | null
          created_at: string | null
          day_id: string | null
          id: string | null
          meal_id: string | null
          meal_plan_id: string | null
          organization_id: string | null
          patient_comment: string | null
          patient_id: string | null
          reviewed_at: string | null
          updated_at: string | null
        }
        Insert: {
          adherence_status?: string | null
          assignment_id?: string | null
          comment_updated_at?: string | null
          created_at?: string | null
          day_id?: string | null
          id?: string | null
          meal_id?: string | null
          meal_plan_id?: string | null
          organization_id?: string | null
          patient_comment?: string | null
          patient_id?: string | null
          reviewed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          adherence_status?: string | null
          assignment_id?: string | null
          comment_updated_at?: string | null
          created_at?: string | null
          day_id?: string | null
          id?: string | null
          meal_id?: string | null
          meal_plan_id?: string | null
          organization_id?: string | null
          patient_comment?: string | null
          patient_id?: string | null
          reviewed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      patient_appointments: {
        Row: {
          duration_minutes: number | null
          ends_at: string | null
          has_pending_change: boolean | null
          id: string | null
          modality: string | null
          starts_at: string | null
          status: string | null
          time_zone: string | null
          virtual_meeting_url: string | null
        }
        Insert: {
          duration_minutes?: number | null
          ends_at?: string | null
          has_pending_change?: never
          id?: string | null
          modality?: string | null
          starts_at?: string | null
          status?: string | null
          time_zone?: string | null
          virtual_meeting_url?: never
        }
        Update: {
          duration_minutes?: number | null
          ends_at?: string | null
          has_pending_change?: never
          id?: string | null
          modality?: string | null
          starts_at?: string | null
          status?: string | null
          time_zone?: string | null
          virtual_meeting_url?: never
        }
        Relationships: []
      }
      patient_current_meal_plans: {
        Row: {
          assignment_id: string | null
          assignment_kind: string | null
          content: Json | null
          id: string | null
          organization_id: string | null
          patient_id: string | null
          published_at: string | null
          title: string | null
          version_id: string | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_directory: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          organization_id: string | null
          phone: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_initial_measurements: {
        Row: {
          height_cm: number | null
          hip_cm: number | null
          initial_weight_kg: number | null
          patient_id: string | null
          recorded_on: string | null
          target_weight_kg: number | null
          updated_at: string | null
          updated_by: string | null
          waist_cm: number | null
        }
        Insert: {
          height_cm?: number | null
          hip_cm?: number | null
          initial_weight_kg?: number | null
          patient_id?: string | null
          recorded_on?: string | null
          target_weight_kg?: number | null
          updated_at?: string | null
          updated_by?: string | null
          waist_cm?: number | null
        }
        Update: {
          height_cm?: number | null
          hip_cm?: number | null
          initial_weight_kg?: number | null
          patient_id?: string | null
          recorded_on?: string | null
          target_weight_kg?: number | null
          updated_at?: string | null
          updated_by?: string | null
          waist_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_initial_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_initial_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_initial_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "daily_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_initial_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patient_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_initial_measurements_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patient_portal_home"
            referencedColumns: ["patient_id"]
          },
        ]
      }
      patient_portal_home: {
        Row: {
          current_plan_name: string | null
          first_name: string | null
          last_name: string | null
          nutrition_goal: string | null
          organization_id: string | null
          patient_id: string | null
          portal_access_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_recent_appointments: {
        Row: {
          ends_at: string | null
          id: string | null
          modality: string | null
          nutritionist_user_id: string | null
          organization_id: string | null
          patient_id: string | null
          payment_status: string | null
          starts_at: string | null
          status: string | null
          time_zone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointments_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["organization_id", "patient_id"]
          },
        ]
      }
      patient_recommendations: {
        Row: {
          created_at: string | null
          id: string | null
          organization_id: string | null
          patient_id: string | null
          recommendation_text: string | null
          response_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          organization_id?: string | null
          patient_id?: string | null
          recommendation_text?: string | null
          response_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          organization_id?: string | null
          patient_id?: string | null
          recommendation_text?: string | null
          response_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recommendations_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_recommendations_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_recommendations_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_recommendations_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_recommendations_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["organization_id", "patient_id"]
          },
        ]
      }
      professional_anthropometric_fields: {
        Row: {
          id: string | null
          label: string | null
          organization_id: string | null
          position: number | null
          status: string | null
          unit: string | null
        }
        Insert: {
          id?: string | null
          label?: string | null
          organization_id?: string | null
          position?: number | null
          status?: string | null
          unit?: string | null
        }
        Update: {
          id?: string | null
          label?: string | null
          organization_id?: string | null
          position?: number | null
          status?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_anthropometric_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_anthropometric_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_appointment_notes: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          note: string | null
          nutritionist_user_id: string | null
          organization_id: string | null
          patient_id: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          note?: string | null
          nutritionist_user_id?: string | null
          organization_id?: string | null
          patient_id?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          note?: string | null
          nutritionist_user_id?: string | null
          organization_id?: string | null
          patient_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_private_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_private_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "patient_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_private_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "patient_recent_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointment_private_notes_appointment"
            columns: ["organization_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointment_private_notes_appointment"
            columns: ["organization_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_recent_appointments"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointment_private_notes_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointment_private_notes_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointment_private_notes_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointment_private_notes_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_appointment_private_notes_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["organization_id", "patient_id"]
          },
        ]
      }
      professional_meal_plans: {
        Row: {
          assignment_kind: string | null
          assignment_status: string | null
          created_at: string | null
          draft_version_id: string | null
          editable_content: Json | null
          editable_title: string | null
          editable_version_number: number | null
          id: string | null
          organization_id: string | null
          owner_nutritionist_user_id: string | null
          patient_first_name: string | null
          patient_id: string | null
          patient_last_name: string | null
          pending_comment_count: number | null
          published_at: string | null
          published_version_number: number | null
          status: string | null
          title: string | null
          updated_at: string | null
          visible_version_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_meal_plans_bound_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "anthropometry_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_meal_plans_bound_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "clinical_patient_profiles"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_meal_plans_bound_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "daily_patients"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_meal_plans_bound_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_directory"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "fk_meal_plans_bound_patient"
            columns: ["organization_id", "patient_id"]
            isOneToOne: false
            referencedRelation: "patient_portal_home"
            referencedColumns: ["organization_id", "patient_id"]
          },
          {
            foreignKeyName: "meal_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "admin_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "current_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_patient_anthropometry: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          id: string | null
          note: string | null
          patient_id: string | null
          recorded_on: string | null
          updated_at: string | null
          values: Json | null
        }
        Insert: {
          can_edit?: never
          created_at?: string | null
          id?: string | null
          note?: string | null
          patient_id?: string | null
          recorded_on?: string | null
          updated_at?: string | null
          values?: Json | null
        }
        Update: {
          can_edit?: never
          created_at?: string | null
          id?: string | null
          note?: string | null
          patient_id?: string | null
          recorded_on?: string | null
          updated_at?: string | null
          values?: Json | null
        }
        Relationships: []
      }
      professional_pending_appointment_changes: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          is_late: boolean | null
          kind: string | null
          notice_hours: number | null
          patient_id: string | null
          quoted_amount: number | null
          requested_duration_minutes: number | null
          requested_modality: string | null
          requested_starts_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_appointment_change_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_appointment_change_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_appointment_change_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_recent_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acknowledge_alert: { Args: { p_alert_id: string }; Returns: boolean }
      assign_check_in: {
        Args: { p_due_date?: string; p_org_id: string; p_patient_id: string }
        Returns: string
      }
      assign_daily_checkin: {
        Args: { p_due: string; p_patient: string }
        Returns: string
      }
      assign_daily_phrase: {
        Args: { p_id: string; p_patients: string[] }
        Returns: undefined
      }
      assign_meal_plan: {
        Args: {
          p_assignment_kind?: string
          p_meal_plan_id: string
          p_patient_id: string
        }
        Returns: string
      }
      cancel_professional_appointment: {
        Args: {
          p_amount?: number
          p_appointment_id: string
          p_billing_decision: string
        }
        Returns: boolean
      }
      complete_patient_invitation: { Args: never; Returns: boolean }
      consume_google_calendar_oauth_state: {
        Args: { p_state_hash: string }
        Returns: {
          nutritionist_user_id: string
          organization_id: string
        }[]
      }
      correct_income_payment: {
        Args: {
          p_amount: number
          p_date: string
          p_expected: string
          p_method: string
          p_note?: string
          p_payment: string
          p_request: string
        }
        Returns: string
      }
      create_appointment: {
        Args: {
          p_currency: string
          p_duration_minutes: number
          p_modality: string
          p_nutritionist_user_id: string
          p_org_id: string
          p_patient_id: string
          p_private_note?: string
          p_quoted_amount: number
          p_starts_at: string
          p_time_zone: string
        }
        Returns: string
      }
      create_google_calendar_oauth_state: {
        Args: {
          p_expires_at: string
          p_organization_id: string
          p_state_hash: string
        }
        Returns: undefined
      }
      create_meal_plan: {
        Args: { p_content?: Json; p_org_id: string; p_title: string }
        Returns: string
      }
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      create_patient: {
        Args: {
          p_email?: string
          p_first_name: string
          p_goal?: string
          p_last_name: string
          p_org_id: string
          p_phone?: string
        }
        Returns: string
      }
      create_patient_invitation_for_service: {
        Args: {
          p_email: string
          p_first_name: string
          p_invited_user_id: string
          p_last_name: string
          p_nutritionist_user_id: string
          p_org_id: string
        }
        Returns: string
      }
      create_professional_appointment: {
        Args: {
          p_currency: string
          p_duration_minutes: number
          p_modality: string
          p_org_id: string
          p_patient_id: string
          p_quoted_amount: number
          p_starts_at: string
          p_time_zone: string
        }
        Returns: string
      }
      create_recommendation: {
        Args: {
          p_org_id: string
          p_patient_id: string
          p_response_id?: string
          p_text: string
        }
        Returns: string
      }
      delete_patient_anthropometric_revision: {
        Args: { p_revision_id: string }
        Returns: undefined
      }
      duplicate_meal_plan: {
        Args: { p_source_meal_plan_id: string; p_title?: string }
        Returns: string
      }
      get_admin_metrics: { Args: never; Returns: Json }
      get_appointment_for_google_sync: {
        Args: { p_appointment_id: string }
        Returns: {
          appointment_id: string
          ends_at: string
          google_calendar_event_id: string
          modality: string
          nutritionist_user_id: string
          organization_id: string
          selected_google_calendar_id: string
          starts_at: string
          status: string
          time_zone: string
          virtual_meeting_url: string
        }[]
      }
      get_checkin_questions: { Args: { p_org: string }; Returns: Json }
      get_current_access_context: { Args: never; Returns: Json }
      get_free_checkin: { Args: { p_patient: string }; Returns: Json }
      get_google_calendar_connection_for_service: {
        Args: { p_nutritionist_user_id: string; p_organization_id: string }
        Returns: {
          refresh_token_ciphertext: string
          refresh_token_iv: string
        }[]
      }
      get_google_calendar_connection_status: {
        Args: { p_organization_id: string }
        Returns: {
          calendar_label: string
          calendar_selected: boolean
          connected_at: string
          status: string
        }[]
      }
      get_my_appointment_preferences: { Args: { p_org: string }; Returns: Json }
      get_my_branding: { Args: never; Returns: Json }
      get_my_professional_profile: { Args: { p_org: string }; Returns: Json }
      get_my_schedule_settings: { Args: { p_org: string }; Returns: Json }
      get_patient_appointment_policy: {
        Args: { p_appointment: string }
        Returns: Json
      }
      get_pending_patient_invitation_for_service: {
        Args: { p_email: string; p_org_id: string }
        Returns: string
      }
      mark_appointment_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      publish_meal_plan: { Args: { p_meal_plan_id: string }; Returns: string }
      record_appointment_payment: {
        Args: {
          p_amount: number
          p_appointment_id: string
          p_method: string
          p_note?: string
          p_occurred_at?: string
        }
        Returns: string
      }
      record_daily_weight: {
        Args: {
          p_date: string
          p_patient: string
          p_request_id: string
          p_weight: number
        }
        Returns: string
      }
      record_income_movement: {
        Args: {
          p_amount: number
          p_appointment: string
          p_date: string
          p_method: string
          p_note?: string
          p_refund?: string
          p_request: string
        }
        Returns: string
      }
      request_patient_appointment_change: {
        Args: {
          p_appointment_id: string
          p_kind: string
          p_requested_duration_minutes?: number
          p_requested_modality?: string
          p_requested_starts_at?: string
        }
        Returns: string
      }
      reschedule_professional_appointment: {
        Args: {
          p_appointment_id: string
          p_duration_minutes: number
          p_modality: string
          p_quoted_amount: number
          p_starts_at: string
        }
        Returns: string
      }
      resolve_alert: {
        Args: { p_alert_id: string; p_notes?: string }
        Returns: boolean
      }
      resolve_appointment_billing: {
        Args: {
          p_amount?: number
          p_appointment_id: string
          p_decision: string
        }
        Returns: boolean
      }
      resolve_patient_appointment_change: {
        Args: {
          p_billing_decision?: string
          p_decision: string
          p_request_id: string
        }
        Returns: string
      }
      respond_daily_task: {
        Args: {
          p_comment: string
          p_completed: boolean
          p_list: string
          p_task: string
        }
        Returns: undefined
      }
      retire_meal_plan: { Args: { p_meal_plan_id: string }; Returns: boolean }
      review_meal_plan_comment: {
        Args: { p_activity_id: string }
        Returns: boolean
      }
      save_anthropometric_field: {
        Args: {
          p_field_id: string
          p_label: string
          p_org_id: string
          p_position: number
          p_status?: string
          p_unit: string
        }
        Returns: string
      }
      save_checkin_questions: {
        Args: { p_expected?: string; p_org: string; p_questions: Json }
        Returns: string
      }
      save_daily_checkin_settings: {
        Args: { p_fields: string[]; p_org: string }
        Returns: undefined
      }
      save_daily_list: {
        Args: {
          p_days: number
          p_expected?: string
          p_id: string
          p_items: Json
          p_org: string
          p_title: string
        }
        Returns: string
      }
      save_daily_phrase: {
        Args: {
          p_delete?: boolean
          p_expected?: string
          p_id: string
          p_org: string
          p_text: string
        }
        Returns: string
      }
      save_library_content: {
        Args: {
          p_body: Json
          p_category: string
          p_expected_updated_at?: string
          p_id: string
          p_kind: string
          p_org_id: string
          p_status: string
          p_title: string
        }
        Returns: string
      }
      save_my_appointment_preferences: {
        Args: { p_expected?: string; p_org: string; p_settings: Json }
        Returns: string
      }
      save_my_professional_profile: {
        Args: {
          p_expected_account?: string
          p_expected_practice?: string
          p_org: string
          p_profile: Json
        }
        Returns: Json
      }
      save_my_schedule_settings: {
        Args: { p_expected?: string; p_org: string; p_settings: Json }
        Returns: string
      }
      save_organization_branding: {
        Args: { p_expected?: string; p_org: string; p_settings: Json }
        Returns: undefined
      }
      save_patient_anthropometric_revision: {
        Args: {
          p_note?: string
          p_patient_id: string
          p_recorded_on: string
          p_revision_id: string
          p_values: Json
        }
        Returns: string
      }
      save_patient_initial_measurements: {
        Args: {
          p_date: string
          p_expected?: string
          p_patient: string
          p_values: Json
        }
        Returns: undefined
      }
      set_daily_list_assignment: {
        Args: {
          p_active: boolean
          p_delete?: boolean
          p_id: string
          p_patient: string
        }
        Returns: undefined
      }
      set_google_calendar_event_for_service: {
        Args: { p_appointment_id: string; p_google_calendar_event_id?: string }
        Returns: boolean
      }
      set_google_calendar_selection_for_service: {
        Args: {
          p_calendar_id: string
          p_calendar_label: string
          p_nutritionist_user_id: string
          p_organization_id: string
        }
        Returns: undefined
      }
      set_google_calendar_sync_result_for_service: {
        Args: {
          p_appointment_id: string
          p_google_calendar_event_id?: string
          p_has_external_conflict?: boolean
          p_virtual_meeting_url?: string
        }
        Returns: boolean
      }
      set_meal_plan_meal_activity: {
        Args: {
          p_adherence_status?: string
          p_comment?: string
          p_day_id: string
          p_meal_id: string
          p_meal_plan_id: string
        }
        Returns: string
      }
      set_organization_status: {
        Args: { p_org_id: string; p_status: string }
        Returns: boolean
      }
      store_google_calendar_connection: {
        Args: {
          p_access_token_expires_at: string
          p_granted_scopes: string[]
          p_nutritionist_user_id: string
          p_organization_id: string
          p_refresh_token_ciphertext: string
          p_refresh_token_iv: string
        }
        Returns: undefined
      }
      submit_check_in: {
        Args: {
          p_adherence: number
          p_assignment_id: string
          p_energy: number
          p_help_requested?: boolean
          p_notes?: string
        }
        Returns: string
      }
      submit_daily_checkin: {
        Args: {
          p_adherence: number
          p_answers: Json
          p_assignment: string
          p_energy: number
          p_help: boolean
          p_notes: string
        }
        Returns: string
      }
      submit_free_checkin: {
        Args: {
          p_answers: Json
          p_patient: string
          p_request: string
          p_version: string
        }
        Returns: string
      }
      submit_question_checkin: {
        Args: { p_answers: Json; p_assignment: string }
        Returns: string
      }
      update_income_appointment_price: {
        Args: { p_amount: number; p_appointment: string; p_expected: string }
        Returns: string
      }
      update_meal_plan_draft: {
        Args: { p_content: Json; p_meal_plan_id: string; p_title: string }
        Returns: string
      }
      update_professional_appointment: {
        Args: {
          p_appointment_id: string
          p_duration_minutes: number
          p_modality: string
          p_quoted_amount: number
          p_starts_at: string
          p_time_zone: string
        }
        Returns: boolean
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
      [_ in never]: never
    }
    Views: {
      pg_all_foreign_keys: {
        Row: {
          fk_columns: unknown[] | null
          fk_constraint_name: unknown
          fk_schema_name: unknown
          fk_table_name: unknown
          fk_table_oid: unknown
          is_deferrable: boolean | null
          is_deferred: boolean | null
          match_type: string | null
          on_delete: string | null
          on_update: string | null
          pk_columns: unknown[] | null
          pk_constraint_name: unknown
          pk_index_name: unknown
          pk_schema_name: unknown
          pk_table_name: unknown
          pk_table_oid: unknown
        }
        Relationships: []
      }
      tap_funky: {
        Row: {
          args: string | null
          is_definer: boolean | null
          is_strict: boolean | null
          is_visible: boolean | null
          kind: unknown
          langoid: unknown
          name: unknown
          oid: unknown
          owner: unknown
          returns: string | null
          returns_set: boolean | null
          schema: unknown
          volatility: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _cleanup: { Args: never; Returns: boolean }
      _contract_on: { Args: { "": string }; Returns: unknown }
      _currtest: { Args: never; Returns: number }
      _db_privs: { Args: never; Returns: unknown[] }
      _extensions: { Args: never; Returns: unknown[] }
      _get: { Args: { "": string }; Returns: number }
      _get_latest: { Args: { "": string }; Returns: number[] }
      _get_note: { Args: { "": string }; Returns: string }
      _is_verbose: { Args: never; Returns: boolean }
      _prokind: { Args: { p_oid: unknown }; Returns: unknown }
      _query: { Args: { "": string }; Returns: string }
      _refine_vol: { Args: { "": string }; Returns: string }
      _retval: { Args: { "": string }; Returns: string }
      _table_privs: { Args: never; Returns: unknown[] }
      _temptypes: { Args: { "": string }; Returns: string }
      _todo: { Args: never; Returns: string }
      col_is_null:
        | {
            Args: {
              column_name: unknown
              description?: string
              schema_name: unknown
              table_name: unknown
            }
            Returns: string
          }
        | {
            Args: {
              column_name: unknown
              description?: string
              table_name: unknown
            }
            Returns: string
          }
      col_not_null:
        | {
            Args: {
              column_name: unknown
              description?: string
              schema_name: unknown
              table_name: unknown
            }
            Returns: string
          }
        | {
            Args: {
              column_name: unknown
              description?: string
              table_name: unknown
            }
            Returns: string
          }
      diag:
        | {
            Args: { msg: unknown }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { msg: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      diag_test_name: { Args: { "": string }; Returns: string }
      do_tap:
        | { Args: never; Returns: string[] }
        | { Args: { "": string }; Returns: string[] }
      fail:
        | { Args: never; Returns: string }
        | { Args: { "": string }; Returns: string }
      findfuncs: { Args: { "": string }; Returns: string[] }
      finish: { Args: { exception_on_failure?: boolean }; Returns: string[] }
      format_type_string: { Args: { "": string }; Returns: string }
      has_unique: { Args: { "": string }; Returns: string }
      in_todo: { Args: never; Returns: boolean }
      is_empty: { Args: { "": string }; Returns: string }
      isnt_empty: { Args: { "": string }; Returns: string }
      lives_ok: { Args: { "": string }; Returns: string }
      no_plan: { Args: never; Returns: boolean[] }
      num_failed: { Args: never; Returns: number }
      os_name: { Args: never; Returns: string }
      pass:
        | { Args: never; Returns: string }
        | { Args: { "": string }; Returns: string }
      pg_version: { Args: never; Returns: string }
      pg_version_num: { Args: never; Returns: number }
      pgtap_version: { Args: never; Returns: number }
      runtests:
        | { Args: never; Returns: string[] }
        | { Args: { "": string }; Returns: string[] }
      skip:
        | { Args: { "": string }; Returns: string }
        | { Args: { how_many: number; why: string }; Returns: string }
      throws_ok: { Args: { "": string }; Returns: string }
      todo:
        | { Args: { how_many: number }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] }
        | { Args: { why: string }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] }
      todo_end: { Args: never; Returns: boolean[] }
      todo_start:
        | { Args: never; Returns: boolean[] }
        | { Args: { "": string }; Returns: boolean[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      _time_trial_type: {
        a_time: number | null
      }
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
  api: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
