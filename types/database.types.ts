export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    consultation_count: number;
                    last_consultation_date: string | null;
                    subscription_tier: string;
                    preferences: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    consultation_count?: number;
                    last_consultation_date?: string | null;
                    subscription_tier?: string;
                    preferences?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    consultation_count?: number;
                    last_consultation_date?: string | null;
                    subscription_tier?: string;
                    preferences?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            activity_logs: {
                Row: {
                    id: string;
                    user_id: string | null;
                    action_type: string;
                    metadata: Json | null;
                    ip_address: string | null;
                    user_agent: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    action_type: string;
                    metadata?: Json | null;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    action_type?: string;
                    metadata?: Json | null;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    created_at?: string;
                };
            };
            memos: {
                Row: {
                    id: string;
                    user_id: string;
                    content: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    content: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    content?: string;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            posts: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    content: string;
                    mode: "standard" | "consultation";
                    is_published: boolean;
                    images: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    content: string;
                    mode?: "standard" | "consultation";
                    is_published?: boolean;
                    images?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    title?: string;
                    content?: string;
                    mode?: "standard" | "consultation";
                    is_published?: boolean;
                    images?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            consultations: {
                Row: {
                    id: string;
                    user_id: string;
                    post_id: string;
                    analysis: string;
                    analysis_data: Json | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    post_id: string;
                    analysis: string;
                    analysis_data?: Json | null;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    post_id?: string;
                    analysis?: string;
                    analysis_data?: Json | null;
                    created_at?: string;
                };
            };
        };
    };
}
