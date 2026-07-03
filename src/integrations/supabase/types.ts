export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      classes: {
        Row: {
          congregation_id: string | null
          created_at: string
          id: number
          name: string
          teacher_student_id: number | null
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          id?: number
          name: string
          teacher_student_id?: number | null
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          id?: number
          name?: string
          teacher_student_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_student_id_fkey"
            columns: ["teacher_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      congregations: {
        Row: {
          created_at: string
          headquarters_id: string
          id: string
          is_headquarters: boolean
          name: string
          regional_id: string | null
        }
        Insert: {
          created_at?: string
          headquarters_id: string
          id?: string
          is_headquarters?: boolean
          name: string
          regional_id?: string | null
        }
        Update: {
          created_at?: string
          headquarters_id?: string
          id?: string
          is_headquarters?: boolean
          name?: string
          regional_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "congregations_headquarters_id_fkey"
            columns: ["headquarters_id"]
            isOneToOne: false
            referencedRelation: "headquarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "congregations_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionals"
            referencedColumns: ["id"]
          },
        ]
      }
      headquarters: {
        Row: {
          city: string | null
          created_at: string
          id: string
          ministry_id: string
          name: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          ministry_id: string
          name: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          ministry_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "headquarters_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          brand_primary_hsl: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          logo_url: string | null
          name: string
          president_pastor: string | null
          state: string | null
        }
        Insert: {
          brand_primary_hsl?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          logo_url?: string | null
          name: string
          president_pastor?: string | null
          state?: string | null
        }
        Update: {
          brand_primary_hsl?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          president_pastor?: string | null
          state?: string | null
        }
        Relationships: []
      }
      pending_users: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          display_name: string | null
          email: string
          id: string
          requested_congregation_id: string | null
          requested_headquarters_id: string | null
          requested_ministry_id: string | null
          requested_regional_id: string | null
          requested_role: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          display_name?: string | null
          email: string
          id?: string
          requested_congregation_id?: string | null
          requested_headquarters_id?: string | null
          requested_ministry_id?: string | null
          requested_regional_id?: string | null
          requested_role?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          display_name?: string | null
          email?: string
          id?: string
          requested_congregation_id?: string | null
          requested_headquarters_id?: string | null
          requested_ministry_id?: string | null
          requested_regional_id?: string | null
          requested_role?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_users_requested_congregation_id_fkey"
            columns: ["requested_congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_users_requested_headquarters_id_fkey"
            columns: ["requested_headquarters_id"]
            isOneToOne: false
            referencedRelation: "headquarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_users_requested_ministry_id_fkey"
            columns: ["requested_ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_users_requested_regional_id_fkey"
            columns: ["requested_regional_id"]
            isOneToOne: false
            referencedRelation: "regionals"
            referencedColumns: ["id"]
          },
        ]
      }
      "public.ministries": {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      regionals: {
        Row: {
          created_at: string
          headquarters_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          headquarters_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          headquarters_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "regionals_headquarters_id_fkey"
            columns: ["headquarters_id"]
            isOneToOne: false
            referencedRelation: "headquarters"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          bibles: number | null
          cash_difference: number | null
          class_id: number | null
          class_notes: string | null
          created_at: string
          ebd_notes: string | null
          hymn: string | null
          id: string
          magazines: number | null
          offering_cash: number | null
          offering_pix: number | null
          pix_difference: number | null
          pix_receipt_urls: string[] | null
          present_students: string[] | null
          reconciled: boolean | null
          registration_date: string
          total_present: number | null
          visitors: number | null
        }
        Insert: {
          bibles?: number | null
          cash_difference?: number | null
          class_id?: number | null
          class_notes?: string | null
          created_at?: string
          ebd_notes?: string | null
          hymn?: string | null
          id?: string
          magazines?: number | null
          offering_cash?: number | null
          offering_pix?: number | null
          pix_difference?: number | null
          pix_receipt_urls?: string[] | null
          present_students?: string[] | null
          reconciled?: boolean | null
          registration_date?: string
          total_present?: number | null
          visitors?: number | null
        }
        Update: {
          bibles?: number | null
          cash_difference?: number | null
          class_id?: number | null
          class_notes?: string | null
          created_at?: string
          ebd_notes?: string | null
          hymn?: string | null
          id?: string
          magazines?: number | null
          offering_cash?: number | null
          offering_pix?: number | null
          pix_difference?: number | null
          pix_receipt_urls?: string[] | null
          present_students?: string[] | null
          reconciled?: boolean | null
          registration_date?: string
          total_present?: number | null
          visitors?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          active: boolean | null
          address: string | null
          birth_date: string | null
          cargo: string | null
          class_id: number | null
          created_at: string
          id: number
          name: string
          phone: string | null
        }
        Insert: {
          active?: boolean | null
          address?: string | null
          birth_date?: string | null
          cargo?: string | null
          class_id?: number | null
          created_at?: string
          id?: number
          name: string
          phone?: string | null
        }
        Update: {
          active?: boolean | null
          address?: string | null
          birth_date?: string | null
          cargo?: string | null
          class_id?: number | null
          created_at?: string
          id?: number
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      teacher_classes: {
        Row: {
          class_id: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          class_id: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          class_id?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          congregation_id: string | null
          created_at: string
          headquarters_id: string | null
          id: string
          ministry_id: string | null
          regional_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          congregation_id?: string | null
          created_at?: string
          headquarters_id?: string | null
          id?: string
          ministry_id?: string | null
          regional_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          congregation_id?: string | null
          created_at?: string
          headquarters_id?: string | null
          id?: string
          ministry_id?: string | null
          regional_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_congregation_id_fkey"
            columns: ["congregation_id"]
            isOneToOne: false
            referencedRelation: "congregations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_headquarters_id_fkey"
            columns: ["headquarters_id"]
            isOneToOne: false
            referencedRelation: "headquarters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_user: {
        Args: {
          _congregation_id?: string
          _headquarters_id?: string
          _ministry_id?: string
          _pending_id: string
          _regional_id?: string
          _role: string
        }
        Returns: undefined
      }
      get_admin_dashboard_summary: {
        Args: { _class_ids?: number[]; _today?: string }
        Returns: Json
      }
      get_admin_dashboard_trends: {
        Args: {
          _class_ids?: number[]
          _end_date?: string
          _selected_date?: string
          _start_date?: string
        }
        Returns: Json
      }
      get_user_congregation: { Args: { _user_id: string }; Returns: string }
      get_user_headquarters: { Args: { _user_id: string }; Returns: string }
      get_user_ministry: { Args: { _user_id: string }; Returns: string }
      get_user_regional: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      reject_user: { Args: { _pending_id: string }; Returns: undefined }
      teacher_has_class: {
        Args: { _class_id: number; _user_id: string }
        Returns: boolean
      }
      user_can_manage_congregation_structure: {
        Args: { _congregation_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_manage_headquarters: {
        Args: { _headquarters_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_manage_regional: {
        Args: { _regional_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_congregation: {
        Args: { _congregation_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_headquarters: {
        Args: { _headquarters_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_ministry: {
        Args: { _ministry_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_see_regional: {
        Args: { _regional_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "secretario_ebd"
        | "professor_classe"
        | "igreja_mae"
        | "igreja_sede"
        | "admin_regional"
        | "master"
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
  public: {
    Enums: {
      app_role: [
        "secretario_ebd",
        "professor_classe",
        "igreja_mae",
        "igreja_sede",
        "admin_regional",
        "master",
      ],
    },
  },
} as const
