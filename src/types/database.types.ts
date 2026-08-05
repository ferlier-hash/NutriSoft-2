export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  app: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          status: 'active' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          status: 'active' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          status?: 'active' | 'suspended'
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_platform_roles: {
        Row: {
          id: string
          user_id: string
          role: 'platform_admin'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'platform_admin'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'platform_admin'
          created_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'organization_owner' | 'nutritionist' | 'assistant'
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: 'organization_owner' | 'nutritionist' | 'assistant'
          status: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'organization_owner' | 'nutritionist' | 'assistant'
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          organization_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          birth_date: string | null
          city: string | null
          country_code: string | null
          nutrition_goal: string | null
          current_plan_name: string | null
          status: 'active' | 'archived'
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          first_name: string
          last_name: string
          email?: string | null
          phone?: string | null
          birth_date?: string | null
          city?: string | null
          country_code?: string | null
          nutrition_goal?: string | null
          current_plan_name?: string | null
          status: 'active' | 'archived'
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          first_name?: string
          last_name?: string
          email?: string | null
          phone?: string | null
          birth_date?: string | null
          city?: string | null
          country_code?: string | null
          nutrition_goal?: string | null
          current_plan_name?: string | null
          status?: 'active' | 'archived'
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
  api: {
    Views: {
      current_profile: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          created_at: string
          updated_at: string
        }
      }
      current_organizations: {
        Row: {
          id: string
          name: string
          slug: string
          status: string
          my_role: string
          created_at: string
        }
      }
      patient_directory: {
        Row: {
          id: string
          organization_id: string
          first_name: string
          last_name: string
          email: string | null
          phone: string | null
          birth_date: string | null
          city: string | null
          status: string
          created_at: string
        }
      }
    }
    Functions: {
      get_admin_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      set_organization_status: {
        Args: { p_org_id: string; p_status: string }
        Returns: boolean
      }
      create_patient: {
        Args: {
          p_org_id: string
          p_first_name: string
          p_last_name: string
          p_email?: string
          p_phone?: string
          p_goal?: string
        }
        Returns: string
      }
      assign_check_in: {
        Args: { p_org_id: string; p_patient_id: string; p_due_date?: string }
        Returns: string
      }
      submit_check_in: {
        Args: {
          p_assignment_id: string
          p_energy: number
          p_adherence: number
          p_help_requested?: boolean
          p_notes?: string
        }
        Returns: string
      }
      acknowledge_alert: {
        Args: { p_alert_id: string }
        Returns: boolean
      }
      resolve_alert: {
        Args: { p_alert_id: string; p_notes?: string }
        Returns: boolean
      }
      create_recommendation: {
        Args: {
          p_org_id: string
          p_patient_id: string
          p_text: string
          p_response_id?: string
        }
        Returns: string
      }
    }
  }
}
