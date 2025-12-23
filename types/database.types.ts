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
      memos: {
        Row: {
          id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          title: string
          content: string
          mode: 'standard' | 'consultation'
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          mode?: 'standard' | 'consultation'
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          mode?: 'standard' | 'consultation'
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      consultations: {
        Row: {
          id: string
          post_id: string
          analysis: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          analysis: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          analysis?: string
          created_at?: string
        }
      }
    }
  }
}
