export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  bookchronicle: {
    Tables: {
      aladin_cache: {
        Row: {
          key: string;
          saved_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          saved_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          saved_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      books: {
        Row: {
          author: string | null;
          category: string | null;
          category_raw: string | null;
          cover_path: string | null;
          created_at: string;
          id: string;
          isbn13: string | null;
          pages: number | null;
          pages_estimated: boolean;
          pub_date: string | null;
          publisher: string | null;
          size: Json | null;
          source: string;
          spine: Json;
          texture_path: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          author?: string | null;
          category?: string | null;
          category_raw?: string | null;
          cover_path?: string | null;
          created_at?: string;
          id?: string;
          isbn13?: string | null;
          pages?: number | null;
          pages_estimated?: boolean;
          pub_date?: string | null;
          publisher?: string | null;
          size?: Json | null;
          source?: string;
          spine: Json;
          texture_path?: string | null;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          author?: string | null;
          category?: string | null;
          category_raw?: string | null;
          cover_path?: string | null;
          created_at?: string;
          id?: string;
          isbn13?: string | null;
          pages?: number | null;
          pages_estimated?: boolean;
          pub_date?: string | null;
          publisher?: string | null;
          size?: Json | null;
          source?: string;
          spine?: Json;
          texture_path?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      readings: {
        Row: {
          book_id: string;
          created_at: string;
          date_approx: boolean;
          finished_at: string | null;
          id: string;
          note: string | null;
          rating: number | null;
          shelf_position: number | null;
          started_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
          year: number | null;
        };
        Insert: {
          book_id: string;
          created_at?: string;
          date_approx?: boolean;
          finished_at?: string | null;
          id?: string;
          note?: string | null;
          rating?: number | null;
          shelf_position?: number | null;
          started_at?: string | null;
          status: string;
          updated_at?: string;
          user_id?: string;
          year?: number | null;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          date_approx?: boolean;
          finished_at?: string | null;
          id?: string;
          note?: string | null;
          rating?: number | null;
          shelf_position?: number | null;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'readings_book_id_user_id_fkey';
            columns: ['book_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'books';
            referencedColumns: ['id', 'user_id'];
          },
        ];
      };
      settings: {
        Row: {
          category_map: Json;
          last_backup_at: string | null;
          pattern_map: Json;
          spine_style: string;
          theme: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category_map?: Json;
          last_backup_at?: string | null;
          pattern_map?: Json;
          spine_style?: string;
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          category_map?: Json;
          last_backup_at?: string | null;
          pattern_map?: Json;
          spine_style?: string;
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      years: {
        Row: {
          book_of_year: string[];
          one_liner: string | null;
          reading_goal: number | null;
          updated_at: string;
          user_id: string;
          year: number;
        };
        Insert: {
          book_of_year?: string[];
          one_liner?: string | null;
          reading_goal?: number | null;
          updated_at?: string;
          user_id?: string;
          year: number;
        };
        Update: {
          book_of_year?: string[];
          one_liner?: string | null;
          reading_goal?: number | null;
          updated_at?: string;
          user_id?: string;
          year?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  bookchronicle: {
    Enums: {},
  },
} as const;
