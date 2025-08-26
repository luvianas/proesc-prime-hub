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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      environments: {
        Row: {
          avatar_url: string | null
          background_image: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          settings: Json | null
          theme_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          background_image?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          settings?: Json | null
          theme_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          background_image?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json | null
          theme_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          consultant_calendar_url: string | null
          consultant_whatsapp: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          must_change_password: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          consultant_calendar_url?: string | null
          consultant_whatsapp?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          name: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          consultant_calendar_url?: string | null
          consultant_whatsapp?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_customizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_banners: {
        Row: {
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          image_url: string
          is_global: boolean
          link_url: string | null
          order_index: number | null
          school_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          image_url: string
          is_global?: boolean
          link_url?: string | null
          order_index?: number | null
          school_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          image_url?: string
          is_global?: boolean
          link_url?: string | null
          order_index?: number | null
          school_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      school_customizations: {
        Row: {
          consultant_calendar_url: string | null
          consultant_id: string | null
          consultant_name: string | null
          consultant_photo_url: string | null
          consultant_whatsapp: string | null
          created_at: string
          created_by: string | null
          dashboard_links: Json | null
          id: string
          logo_url: string | null
          metabase_integration_url: string | null
          school_id: string | null
          school_name: string
          theme_color: string | null
          updated_at: string
          zendesk_external_id: string | null
          zendesk_integration_url: string | null
        }
        Insert: {
          consultant_calendar_url?: string | null
          consultant_id?: string | null
          consultant_name?: string | null
          consultant_photo_url?: string | null
          consultant_whatsapp?: string | null
          created_at?: string
          created_by?: string | null
          dashboard_links?: Json | null
          id?: string
          logo_url?: string | null
          metabase_integration_url?: string | null
          school_id?: string | null
          school_name: string
          theme_color?: string | null
          updated_at?: string
          zendesk_external_id?: string | null
          zendesk_integration_url?: string | null
        }
        Update: {
          consultant_calendar_url?: string | null
          consultant_id?: string | null
          consultant_name?: string | null
          consultant_photo_url?: string | null
          consultant_whatsapp?: string | null
          created_at?: string
          created_by?: string | null
          dashboard_links?: Json | null
          id?: string
          logo_url?: string | null
          metabase_integration_url?: string | null
          school_id?: string | null
          school_name?: string
          theme_color?: string | null
          updated_at?: string
          zendesk_external_id?: string | null
          zendesk_integration_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_customizations_consultant_id_fkey"
            columns: ["consultant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "school_customizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      usage_events: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          event_name: string
          event_properties: Json | null
          event_type: string
          id: string
          os: string | null
          page: string | null
          referrer: string | null
          school_id: string | null
          session_id: string | null
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          event_name: string
          event_properties?: Json | null
          event_type: string
          id?: string
          os?: string | null
          page?: string | null
          referrer?: string | null
          school_id?: string | null
          session_id?: string | null
          user_id: string
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          event_name?: string
          event_properties?: Json | null
          event_type?: string
          id?: string
          os?: string | null
          page?: string | null
          referrer?: string | null
          school_id?: string | null
          session_id?: string | null
          user_id?: string
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_current_user_school_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      promote_user_to_admin: {
        Args: { user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "admin" | "user" | "gestor"
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
      user_role: ["admin", "user", "gestor"],
    },
  },
} as const
