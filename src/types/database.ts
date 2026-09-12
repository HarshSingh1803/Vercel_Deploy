export type CleaningStatus = "completed" | "failed" | "cancelled";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CleaningHistory = {
  id: string;
  user_id: string;
  original_file_name: string;
  original_file_size: number;
  cleaned_file_size: number | null;
  file_type: string;
  metadata_removed: Record<string, unknown> | null;
  status: CleaningStatus;
  created_at: string;
};

export type UserPlan = {
  id: string;
  user_id: string;
  plan_name: string;
  usage_count: number;
  usage_limit: number;
  expires_at: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      cleaning_history: {
        Row: CleaningHistory;
        Insert: Omit<CleaningHistory, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<CleaningHistory>;
      };
      user_plans: {
        Row: UserPlan;
        Insert: Omit<UserPlan, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<UserPlan>;
      };
    };
  };
};
