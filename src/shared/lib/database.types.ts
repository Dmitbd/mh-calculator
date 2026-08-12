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
          status: "draft" | "published";
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          hero_id: string;
          payload: Json;
          status: "draft" | "published";
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          hero_id?: string;
          payload?: Json;
          status?: "draft" | "published";
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_or_update_draft_hero_build_set: {
        Args: { p_hero_id: string; p_payload: Json };
        Returns: undefined;
      };
      publish_hero_build_set: {
        Args: { p_hero_id: string; p_payload: Json };
        Returns: undefined;
      };
      update_published_hero_build_set: {
        Args: { p_hero_id: string; p_payload: Json };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
