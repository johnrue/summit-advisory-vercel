// Database type definitions for Supabase integration
// This will be generated automatically when we run supabase gen types typescript

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      consultation_requests: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          service_type: string
          message: string | null
          created_at: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          phone: string
          service_type: string
          message?: string | null
          created_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          service_type?: string
          message?: string | null
          created_at?: string
          status?: string
          updated_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'manager' | 'guard' | 'client'
          permissions: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'admin' | 'manager' | 'guard' | 'client'
          permissions?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'manager' | 'guard' | 'client'
          permissions?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_data: Json | null
          new_data: Json | null
          changed_by: string | null
          changed_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_data?: Json | null
          new_data?: Json | null
          changed_by?: string | null
          changed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_data?: Json | null
          new_data?: Json | null
          changed_by?: string | null
          changed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          user_uuid?: string
        }
        Returns: 'admin' | 'manager' | 'guard' | 'client'
      }
      user_has_role: {
        Args: {
          required_role: 'admin' | 'manager' | 'guard' | 'client'
          user_uuid?: string
        }
        Returns: boolean
      }
      assign_user_role: {
        Args: {
          target_user_id: string
          new_role: 'admin' | 'manager' | 'guard' | 'client'
          permissions_data?: Json
        }
        Returns: void
      }
    }
    Enums: {
      user_role: 'admin' | 'manager' | 'guard' | 'client'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}