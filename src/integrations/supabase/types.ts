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
      appointment_completions: {
        Row: {
          appointment_id: string
          caregiver_profile_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          family_id: string
          id: string
          notes: string | null
          occurrence_at: string
          ongoing_started_at: string | null
          ongoing_started_by: string | null
          postponed_to: string | null
          reason: string | null
          status: Database["public"]["Enums"]["appointment_completion_status"]
          timer_started_at: string | null
          timer_started_by: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          caregiver_profile_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          family_id: string
          id?: string
          notes?: string | null
          occurrence_at: string
          ongoing_started_at?: string | null
          ongoing_started_by?: string | null
          postponed_to?: string | null
          reason?: string | null
          status: Database["public"]["Enums"]["appointment_completion_status"]
          timer_started_at?: string | null
          timer_started_by?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          caregiver_profile_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          family_id?: string
          id?: string
          notes?: string | null
          occurrence_at?: string
          ongoing_started_at?: string | null
          ongoing_started_by?: string | null
          postponed_to?: string | null
          reason?: string | null
          status?: Database["public"]["Enums"]["appointment_completion_status"]
          timer_started_at?: string | null
          timer_started_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_completions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_completions_caregiver_profile_id_fkey"
            columns: ["caregiver_profile_id"]
            isOneToOne: false
            referencedRelation: "caregiver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_completions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_completions_timer_started_by_fkey"
            columns: ["timer_started_by"]
            isOneToOne: false
            referencedRelation: "caregiver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          all_day: boolean
          allow_ongoing: boolean
          amount_ml: number | null
          child_id: string | null
          color: string | null
          created_at: string
          created_by: string
          ends_at: string | null
          family_id: string
          id: string
          kind: Database["public"]["Enums"]["appointment_kind"]
          late_after_minutes: number
          late_notified_at: string | null
          location: string | null
          missed_after_minutes: number
          missed_notified_at: string | null
          notes: string | null
          notified_at: string | null
          recurrence_byweekday: number[] | null
          recurrence_cancelled: boolean
          recurrence_freq: string | null
          recurrence_interval: number
          recurrence_override_at: string | null
          recurrence_parent_id: string | null
          recurrence_times_of_day: string[] | null
          reminder_minutes: number | null
          starts_at: string
          timer_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          allow_ongoing?: boolean
          amount_ml?: number | null
          child_id?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          ends_at?: string | null
          family_id: string
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          late_after_minutes?: number
          late_notified_at?: string | null
          location?: string | null
          missed_after_minutes?: number
          missed_notified_at?: string | null
          notes?: string | null
          notified_at?: string | null
          recurrence_byweekday?: number[] | null
          recurrence_cancelled?: boolean
          recurrence_freq?: string | null
          recurrence_interval?: number
          recurrence_override_at?: string | null
          recurrence_parent_id?: string | null
          recurrence_times_of_day?: string[] | null
          reminder_minutes?: number | null
          starts_at: string
          timer_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          allow_ongoing?: boolean
          amount_ml?: number | null
          child_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string | null
          family_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["appointment_kind"]
          late_after_minutes?: number
          late_notified_at?: string | null
          location?: string | null
          missed_after_minutes?: number
          missed_notified_at?: string | null
          notes?: string | null
          notified_at?: string | null
          recurrence_byweekday?: number[] | null
          recurrence_cancelled?: boolean
          recurrence_freq?: string | null
          recurrence_interval?: number
          recurrence_override_at?: string | null
          recurrence_parent_id?: string | null
          recurrence_times_of_day?: string[] | null
          reminder_minutes?: number | null
          starts_at?: string
          timer_minutes?: number | null
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
          {
            foreignKeyName: "appointments_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      care_instructions: {
        Row: {
          body: string
          created_at: string
          created_by: string
          family_id: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by: string
          family_id: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          family_id?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_instructions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      care_place_adhoc_items: {
        Row: {
          created_at: string
          created_by: string
          family_id: string
          for_slot_date: string
          for_slot_time: string
          id: string
          inventory_item_id: string
          label: string
          resolved_at: string | null
          resolved_check_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          family_id: string
          for_slot_date: string
          for_slot_time: string
          id?: string
          inventory_item_id: string
          label: string
          resolved_at?: string | null
          resolved_check_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string
          for_slot_date?: string
          for_slot_time?: string
          id?: string
          inventory_item_id?: string
          label?: string
          resolved_at?: string | null
          resolved_check_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_place_adhoc_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_place_adhoc_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_place_adhoc_items_resolved_check_id_fkey"
            columns: ["resolved_check_id"]
            isOneToOne: false
            referencedRelation: "care_place_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      care_place_check_answers: {
        Row: {
          check_id: string
          count_value: number | null
          created_at: string
          family_id: string
          id: string
          item_id: string | null
          item_label_snapshot: string
          item_type_snapshot: Database["public"]["Enums"]["care_place_item_type"]
          yesno_value: boolean | null
        }
        Insert: {
          check_id: string
          count_value?: number | null
          created_at?: string
          family_id: string
          id?: string
          item_id?: string | null
          item_label_snapshot: string
          item_type_snapshot: Database["public"]["Enums"]["care_place_item_type"]
          yesno_value?: boolean | null
        }
        Update: {
          check_id?: string
          count_value?: number | null
          created_at?: string
          family_id?: string
          id?: string
          item_id?: string | null
          item_label_snapshot?: string
          item_type_snapshot?: Database["public"]["Enums"]["care_place_item_type"]
          yesno_value?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "care_place_check_answers_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "care_place_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_place_check_answers_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_place_check_answers_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "care_place_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      care_place_check_times: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          family_id: string
          grace_minutes: number
          id: string
          label: string | null
          time_of_day: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          family_id: string
          grace_minutes?: number
          id?: string
          label?: string | null
          time_of_day: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          family_id?: string
          grace_minutes?: number
          id?: string
          label?: string | null
          time_of_day?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_place_check_times_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      care_place_checklist_items: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          days_left_threshold: number
          decrement_amount: number
          family_id: string
          id: string
          inventory_item_id: string | null
          item_type: Database["public"]["Enums"]["care_place_item_type"]
          label: string
          min_count: number | null
          position: number
          severity: Database["public"]["Enums"]["care_place_severity"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          days_left_threshold?: number
          decrement_amount?: number
          family_id: string
          id?: string
          inventory_item_id?: string | null
          item_type?: Database["public"]["Enums"]["care_place_item_type"]
          label: string
          min_count?: number | null
          position?: number
          severity?: Database["public"]["Enums"]["care_place_severity"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          days_left_threshold?: number
          decrement_amount?: number
          family_id?: string
          id?: string
          inventory_item_id?: string | null
          item_type?: Database["public"]["Enums"]["care_place_item_type"]
          label?: string
          min_count?: number | null
          position?: number
          severity?: Database["public"]["Enums"]["care_place_severity"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_place_checklist_items_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_place_checklist_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      care_place_checks: {
        Row: {
          created_at: string
          family_id: string
          id: string
          notes: string | null
          performed_at: string
          performed_by: string
          scheduled_date: string
          scheduled_time: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by: string
          scheduled_date: string
          scheduled_time: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string
          scheduled_date?: string
          scheduled_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_place_checks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      care_place_missed_checks: {
        Row: {
          created_at: string
          family_id: string
          id: string
          notified_at: string | null
          scheduled_date: string
          scheduled_time: string
          time_id: string
        }
        Insert: {
          created_at?: string
          family_id: string
          id?: string
          notified_at?: string | null
          scheduled_date: string
          scheduled_time: string
          time_id: string
        }
        Update: {
          created_at?: string
          family_id?: string
          id?: string
          notified_at?: string | null
          scheduled_date?: string
          scheduled_time?: string
          time_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_place_missed_checks_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_place_missed_checks_time_id_fkey"
            columns: ["time_id"]
            isOneToOne: false
            referencedRelation: "care_place_check_times"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_profiles: {
        Row: {
          account_user_id: string
          avatar_url: string | null
          color: string
          created_at: string
          family_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_user_id: string
          avatar_url?: string | null
          color?: string
          created_at?: string
          family_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_user_id?: string
          avatar_url?: string | null
          color?: string
          created_at?: string
          family_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_profiles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_shifts: {
        Row: {
          caregiver_profile_id: string | null
          caregiver_user_id: string
          category: string | null
          color: string | null
          created_at: string
          created_by: string
          end_at: string
          family_id: string
          id: string
          recurrence_days_of_week: number[] | null
          recurrence_freq: string | null
          recurrence_interval: number | null
          recurrence_until: string | null
          start_at: string
          updated_at: string
        }
        Insert: {
          caregiver_profile_id?: string | null
          caregiver_user_id: string
          category?: string | null
          color?: string | null
          created_at?: string
          created_by: string
          end_at: string
          family_id: string
          id?: string
          recurrence_days_of_week?: number[] | null
          recurrence_freq?: string | null
          recurrence_interval?: number | null
          recurrence_until?: string | null
          start_at: string
          updated_at?: string
        }
        Update: {
          caregiver_profile_id?: string | null
          caregiver_user_id?: string
          category?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          end_at?: string
          family_id?: string
          id?: string
          recurrence_days_of_week?: number[] | null
          recurrence_freq?: string | null
          recurrence_interval?: number | null
          recurrence_until?: string | null
          start_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_shifts_caregiver_profile_id_fkey"
            columns: ["caregiver_profile_id"]
            isOneToOne: false
            referencedRelation: "caregiver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_shifts_family_id_fkey"
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
          custom_vital_ranges: Json
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
          custom_vital_ranges?: Json
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
          custom_vital_ranges?: Json
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
          at_hospital_since: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          oxygen_critical_minutes: number
          oxygen_warn_minutes: number
          updated_at: string
        }
        Insert: {
          at_hospital_since?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          oxygen_critical_minutes?: number
          oxygen_warn_minutes?: number
          updated_at?: string
        }
        Update: {
          at_hospital_since?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          oxygen_critical_minutes?: number
          oxygen_warn_minutes?: number
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
          material_responsible: boolean
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          display_color?: string | null
          family_id: string
          id?: string
          joined_at?: string
          material_responsible?: boolean
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          display_color?: string | null
          family_id?: string
          id?: string
          joined_at?: string
          material_responsible?: boolean
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
          caregiver_profile_id: string | null
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
          caregiver_profile_id?: string | null
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
          caregiver_profile_id?: string | null
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
            foreignKeyName: "handovers_caregiver_profile_id_fkey"
            columns: ["caregiver_profile_id"]
            isOneToOne: false
            referencedRelation: "caregiver_profiles"
            referencedColumns: ["id"]
          },
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
      inventory_adjustments: {
        Row: {
          created_at: string
          delta: number
          family_id: string
          id: string
          inventory_item_id: string
          note: string | null
          performed_by: string
          reason: Database["public"]["Enums"]["inventory_adjustment_reason"]
          source_check_id: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          family_id: string
          id?: string
          inventory_item_id: string
          note?: string | null
          performed_by: string
          reason: Database["public"]["Enums"]["inventory_adjustment_reason"]
          source_check_id?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          family_id?: string
          id?: string
          inventory_item_id?: string
          note?: string | null
          performed_by?: string
          reason?: Database["public"]["Enums"]["inventory_adjustment_reason"]
          source_check_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_source_check_id_fkey"
            columns: ["source_check_id"]
            isOneToOne: false
            referencedRelation: "care_place_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          active: boolean
          created_at: string
          created_by: string
          days_left_estimate: number | null
          days_left_updated_at: string | null
          expected_at: string | null
          expiry_date: string | null
          family_id: string
          id: string
          location: string | null
          low_stock_threshold: number | null
          name: string
          notes: string | null
          ordered_at: string | null
          ordered_by: string | null
          quantity: number
          supplier: string | null
          supplier_url: string | null
          unit: Database["public"]["Enums"]["unit_kind"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by: string
          days_left_estimate?: number | null
          days_left_updated_at?: string | null
          expected_at?: string | null
          expiry_date?: string | null
          family_id: string
          id?: string
          location?: string | null
          low_stock_threshold?: number | null
          name: string
          notes?: string | null
          ordered_at?: string | null
          ordered_by?: string | null
          quantity?: number
          supplier?: string | null
          supplier_url?: string | null
          unit: Database["public"]["Enums"]["unit_kind"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string
          days_left_estimate?: number | null
          days_left_updated_at?: string | null
          expected_at?: string | null
          expiry_date?: string | null
          family_id?: string
          id?: string
          location?: string | null
          low_stock_threshold?: number | null
          name?: string
          notes?: string | null
          ordered_at?: string | null
          ordered_by?: string | null
          quantity?: number
          supplier?: string | null
          supplier_url?: string | null
          unit?: Database["public"]["Enums"]["unit_kind"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_family_id_fkey"
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
          invited_email: string | null
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
          invited_email?: string | null
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
          invited_email?: string | null
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
      med_dose_events: {
        Row: {
          created_at: string
          late_notified_at: string | null
          medication_id: string
          missed_notified_at: string | null
          scheduled_for: string
          started_notified_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          late_notified_at?: string | null
          medication_id: string
          missed_notified_at?: string | null
          scheduled_for: string
          started_notified_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          late_notified_at?: string | null
          medication_id?: string
          missed_notified_at?: string | null
          scheduled_for?: string
          started_notified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_dose_events_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      med_logs: {
        Row: {
          caregiver_profile_id: string | null
          child_id: string
          created_at: string
          family_id: string
          given_at: string | null
          given_by: string | null
          id: string
          medication_id: string
          notes: string | null
          ongoing_started_at: string | null
          ongoing_started_by: string | null
          postponed_to: string | null
          reason: string | null
          scheduled_for: string
          status: Database["public"]["Enums"]["med_log_status"]
          timer_started_at: string | null
          timer_started_by: string | null
          updated_at: string
        }
        Insert: {
          caregiver_profile_id?: string | null
          child_id: string
          created_at?: string
          family_id: string
          given_at?: string | null
          given_by?: string | null
          id?: string
          medication_id: string
          notes?: string | null
          ongoing_started_at?: string | null
          ongoing_started_by?: string | null
          postponed_to?: string | null
          reason?: string | null
          scheduled_for: string
          status?: Database["public"]["Enums"]["med_log_status"]
          timer_started_at?: string | null
          timer_started_by?: string | null
          updated_at?: string
        }
        Update: {
          caregiver_profile_id?: string | null
          child_id?: string
          created_at?: string
          family_id?: string
          given_at?: string | null
          given_by?: string | null
          id?: string
          medication_id?: string
          notes?: string | null
          ongoing_started_at?: string | null
          ongoing_started_by?: string | null
          postponed_to?: string | null
          reason?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["med_log_status"]
          timer_started_at?: string | null
          timer_started_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "med_logs_caregiver_profile_id_fkey"
            columns: ["caregiver_profile_id"]
            isOneToOne: false
            referencedRelation: "caregiver_profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "med_logs_timer_started_by_fkey"
            columns: ["timer_started_by"]
            isOneToOne: false
            referencedRelation: "caregiver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          active: boolean
          allow_ongoing: boolean
          child_id: string
          color: string | null
          created_at: string
          created_by: string | null
          dose_amount: number | null
          dose_unit: string | null
          family_id: string
          id: string
          instructions: string | null
          late_after_minutes: number
          missed_after_minutes: number
          name: string
          route: Database["public"]["Enums"]["med_route"]
          timer_minutes: number | null
          times: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          allow_ongoing?: boolean
          child_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          dose_amount?: number | null
          dose_unit?: string | null
          family_id: string
          id?: string
          instructions?: string | null
          late_after_minutes?: number
          missed_after_minutes?: number
          name: string
          route?: Database["public"]["Enums"]["med_route"]
          timer_minutes?: number | null
          times?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          allow_ongoing?: boolean
          child_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          dose_amount?: number | null
          dose_unit?: string | null
          family_id?: string
          id?: string
          instructions?: string | null
          late_after_minutes?: number
          missed_after_minutes?: number
          name?: string
          route?: Database["public"]["Enums"]["med_route"]
          timer_minutes?: number | null
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
      oxygen_tanks: {
        Row: {
          created_at: string
          created_by: string | null
          critical_alert_sent_at: string | null
          family_id: string
          flow_lpm: number
          id: string
          low_alert_sent_at: string | null
          notes: string | null
          paused_at: string | null
          paused_seconds: number
          replaced_at: string | null
          started_at: string
          tank_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          critical_alert_sent_at?: string | null
          family_id: string
          flow_lpm: number
          id?: string
          low_alert_sent_at?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          replaced_at?: string | null
          started_at?: string
          tank_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          critical_alert_sent_at?: string | null
          family_id?: string
          flow_lpm?: number
          id?: string
          low_alert_sent_at?: string | null
          notes?: string | null
          paused_at?: string | null
          paused_seconds?: number
          replaced_at?: string | null
          started_at?: string
          tank_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oxygen_tanks_family_id_fkey"
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          family_id: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          family_id: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          family_id?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals: {
        Row: {
          child_id: string
          context: string | null
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
          context?: string | null
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
          context?: string | null
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
      is_material_manager: {
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
      set_family_hospital_mode: {
        Args: { _family_id: string; _on: boolean }
        Returns: string
      }
      shares_family_with: {
        Args: { _me: string; _other_user: string }
        Returns: boolean
      }
      suggest_caregiver_profile: {
        Args: { _at?: string; _family_id: string }
        Returns: string
      }
    }
    Enums: {
      account_type: "family" | "caregiver"
      appointment_completion_status:
        | "done"
        | "skipped"
        | "postponed"
        | "ongoing"
      appointment_kind:
        | "appointment"
        | "therapy"
        | "task"
        | "other"
        | "meal"
        | "sleep"
        | "temperature"
        | "heart_rate"
        | "spo2"
        | "fluids"
        | "diaper"
        | "seizure"
        | "breathing"
        | "note"
        | "inhalation"
      care_place_item_type:
        | "yesno"
        | "count"
        | "days_left"
        | "quantity_estimate"
      care_place_severity: "routine" | "critical"
      inventory_adjustment_reason:
        | "manual_set"
        | "manual_add"
        | "manual_remove"
        | "care_place_check"
        | "expiry_writeoff"
        | "received"
        | "days_left_update"
      invite_status: "pending" | "accepted" | "revoked"
      med_log_status: "given" | "skipped" | "missed" | "postponed" | "ongoing"
      med_route:
        | "oral"
        | "g_tube"
        | "injection"
        | "topical"
        | "inhaled"
        | "other"
      member_role: "owner" | "caregiver"
      shift_label: "morning" | "afternoon" | "night" | "custom"
      unit_kind: "pcs" | "box" | "pack" | "ml" | "l" | "g" | "kg"
      vital_type:
        | "heart_rate"
        | "spo2"
        | "temperature"
        | "weight"
        | "seizure"
        | "fluids"
        | "other"
        | "breathing"
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
      appointment_completion_status: [
        "done",
        "skipped",
        "postponed",
        "ongoing",
      ],
      appointment_kind: [
        "appointment",
        "therapy",
        "task",
        "other",
        "meal",
        "sleep",
        "temperature",
        "heart_rate",
        "spo2",
        "fluids",
        "diaper",
        "seizure",
        "breathing",
        "note",
        "inhalation",
      ],
      care_place_item_type: [
        "yesno",
        "count",
        "days_left",
        "quantity_estimate",
      ],
      care_place_severity: ["routine", "critical"],
      inventory_adjustment_reason: [
        "manual_set",
        "manual_add",
        "manual_remove",
        "care_place_check",
        "expiry_writeoff",
        "received",
        "days_left_update",
      ],
      invite_status: ["pending", "accepted", "revoked"],
      med_log_status: ["given", "skipped", "missed", "postponed", "ongoing"],
      med_route: ["oral", "g_tube", "injection", "topical", "inhaled", "other"],
      member_role: ["owner", "caregiver"],
      shift_label: ["morning", "afternoon", "night", "custom"],
      unit_kind: ["pcs", "box", "pack", "ml", "l", "g", "kg"],
      vital_type: [
        "heart_rate",
        "spo2",
        "temperature",
        "weight",
        "seizure",
        "fluids",
        "other",
        "breathing",
      ],
    },
  },
} as const
