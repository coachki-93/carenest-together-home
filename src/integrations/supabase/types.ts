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
      appointments: {
        Row: {
          all_day: boolean
          child_id: string | null
          color: string | null
          created_at: string
          created_by: string
          ends_at: string | null
          family_id: string
          id: string
          kind: Database["public"]["Enums"]["appointment_kind"]
          location: string | null
          notes: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          child_id?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          ends_at?: string | null
          family_id: string
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          location?: string | null
          notes?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          child_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string | null
          family_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          location?: string | null
          notes?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          allergies: string | null
          created_at: string
          date_of_birth: string | null
          diagnosis: string | null
          doctors: Json
          emergency_contacts: Json
          family_id: string
          id: string
          name: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          created_at?: string
          date_of_birth?: string | null
          diagnosis?: string | null
          doctors?: Json
          emergency_contacts?: Json
          family_id: string
          id?: string
          name: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          created_at?: string
          date_of_birth?: string | null
          diagnosis?: string | null
          doctors?: Json
          emergency_contacts?: Json
          family_id?: string
          id?: string
          name?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      family_members: {
        Row: {
          display_color: string | null
          family_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          display_color?: string | null
          family_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          display_color?: string | null
          family_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      handovers: {
        Row: {
          author_id: string
          child_id: string | null
          created_at: string
          family_id: string
          fluids: string | null
          id: string
          meds: string | null
          mood: string | null
          notes: string | null
          seizures: string | null
          shift: Database["public"]["Enums"]["shift_label"]
          shift_end: string | null
          shift_start: string | null
          sleep: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          child_id?: string | null
          created_at?: string
          family_id: string
          fluids?: string | null
          id?: string
          meds?: string | null
          mood?: string | null
          notes?: string | null
          seizures?: string | null
          shift?: Database["public"]["Enums"]["shift_label"]
          shift_end?: string | null
          shift_start?: string | null
          sleep?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          child_id?: string | null
          created_at?: string
          family_id?: string
          fluids?: string | null
          id?: string
          meds?: string | null
          mood?: string | null
          notes?: string | null
          seizures?: string | null
          shift?: Database["public"]["Enums"]["shift_label"]
          shift_end?: string | null
          shift_start?: string | null
          sleep?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "handovers_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          code: string
          created_at: string
          created_by: string
          email: string | null
          expires_at: string
          family_id: string
          id: string
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code: string
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string
          family_id: string
          id?: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string
          family_id?: string
          id?: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "invites_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      med_logs: {
        Row: {
          child_id: string
          created_at: string
          family_id: string
          given_at: string | null
          given_by: string | null
          id: string
          medication_id: string
          notes: string | null
          scheduled_for: string
          status: Database["public"]["Enums"]["med_log_status"]
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          family_id: string
          given_at?: string | null
          given_by?: string | null
          id?: string
          medication_id: string
          notes?: string | null
          scheduled_for: string
          status?: Database["public"]["Enums"]["med_log_status"]
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          family_id?: string
          given_at?: string | null
          given_by?: string | null
          id?: string
          medication_id?: string
          notes?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["med_log_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_logs_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "med_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "med_logs_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          child_id: string
          color: string | null
          created_at: string
          created_by: string | null
          dose_amount: number | null
          dose_unit: string | null
          family_id: string
          id: string
          instructions: string | null
          name: string
          route: Database["public"]["Enums"]["med_route"]
          times: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          child_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          dose_amount?: number | null
          dose_unit?: string | null
          family_id: string
          id?: string
          instructions?: string | null
          name: string
          route?: Database["public"]["Enums"]["med_route"]
          times?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          child_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          dose_amount?: number | null
          dose_unit?: string | null
          family_id?: string
          id?: string
          instructions?: string | null
          name?: string
          route?: Database["public"]["Enums"]["med_route"]
          times?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_color: string | null
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          onboarded: boolean
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_color?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          onboarded?: boolean
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_color?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          onboarded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      vitals: {
        Row: {
          child_id: string
          created_at: string
          family_id: string
          id: string
          logged_at: string
          logged_by: string | null
          notes: string | null
          unit: string
          updated_at: string
          value: number
          vital_type: Database["public"]["Enums"]["vital_type"]
        }
        Insert: {
          child_id: string
          created_at?: string
          family_id: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          notes?: string | null
          unit: string
          updated_at?: string
          value: number
          vital_type: Database["public"]["Enums"]["vital_type"]
        }
        Update: {
          child_id?: string
          created_at?: string
          family_id?: string
          id?: string
          logged_at?: string
          logged_by?: string | null
          notes?: string | null
          unit?: string
          updated_at?: string
          value?: number
          vital_type?: Database["public"]["Enums"]["vital_type"]
        }
        Relationships: [
          {
            foreignKeyName: "vitals_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: {
        Args: { _code: string; _display_color?: string }
        Returns: string
      }
      is_family_member: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      is_family_owner: {
        Args: { _family_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_invite: {
        Args: { _code: string }
        Returns: {
          expires_at: string
          family_id: string
          family_name: string
          invite_id: string
          status: Database["public"]["Enums"]["invite_status"]
        }[]
      }
      shares_family_with: {
        Args: { _me: string; _other_user: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "family" | "caregiver"
      appointment_kind: "appointment" | "therapy" | "task" | "other"
      invite_status: "pending" | "accepted" | "revoked"
      med_log_status: "given" | "skipped" | "missed"
      med_route:
        | "oral"
        | "g_tube"
        | "injection"
        | "topical"
        | "inhaled"
        | "other"
      member_role: "owner" | "caregiver"
      shift_label: "morning" | "afternoon" | "night" | "custom"
      vital_type:
        | "heart_rate"
        | "spo2"
        | "temperature"
        | "weight"
        | "seizure"
        | "fluids"
        | "other"
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
      account_type: ["family", "caregiver"],
      appointment_kind: ["appointment", "therapy", "task", "other"],
      invite_status: ["pending", "accepted", "revoked"],
      med_log_status: ["given", "skipped", "missed"],
      med_route: ["oral", "g_tube", "injection", "topical", "inhaled", "other"],
      member_role: ["owner", "caregiver"],
      shift_label: ["morning", "afternoon", "night", "custom"],
      vital_type: [
        "heart_rate",
        "spo2",
        "temperature",
        "weight",
        "seizure",
        "fluids",
        "other",
      ],
    },
  },
} as const
