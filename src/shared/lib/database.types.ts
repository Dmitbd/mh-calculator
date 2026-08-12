export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      hero_build_sets: {
        Row: {
          created_at: string;
          hero_id: string;
          payload: Json;
          revision: number;
          status: "draft" | "published";
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          hero_id: string;
          payload: Json;
          revision?: number;
          status: "draft" | "published";
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          hero_id?: string;
          payload?: Json;
          revision?: number;
          status?: "draft" | "published";
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      hero_build_set_revisions: {
        Row: {
          created_at: string;
          event_type:
            | "migrated"
            | "created_draft"
            | "updated_draft"
            | "published"
            | "updated_published"
            | "restored_published";
          hero_id: string;
          id: number;
          payload: Json;
          previous_payload: Json | null;
          previous_revision: number | null;
          previous_status: "draft" | "published" | null;
          revision: number;
          status: "draft" | "published";
          updated_by: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_or_update_draft_hero_build_set: {
        Args: {
          p_expected_revision: number | null;
          p_hero_id: string;
          p_payload: Json;
        };
        Returns: Database["public"]["Tables"]["hero_build_sets"]["Row"];
      };
      publish_hero_build_set: {
        Args: {
          p_expected_revision: number;
          p_hero_id: string;
          p_payload: Json;
        };
        Returns: Database["public"]["Tables"]["hero_build_sets"]["Row"];
      };
      restore_published_hero_build_set: {
        Args: {
          p_expected_revision: number;
          p_hero_id: string;
          p_history_id: number;
        };
        Returns: Database["public"]["Tables"]["hero_build_sets"]["Row"];
      };
      update_published_hero_build_set: {
        Args: {
          p_expected_revision: number;
          p_hero_id: string;
          p_payload: Json;
        };
        Returns: Database["public"]["Tables"]["hero_build_sets"]["Row"];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
