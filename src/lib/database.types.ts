export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          played_at: string
          mode: '1v1' | '2v2'
          team_a_player_ids: string[]
          team_b_player_ids: string[]
          score_a: number
          score_b: number
        }
        Insert: {
          id?: string
          played_at?: string
          mode: '1v1' | '2v2'
          team_a_player_ids: string[]
          team_b_player_ids: string[]
          score_a: number
          score_b: number
        }
        Update: {
          id?: string
          played_at?: string
          mode?: '1v1' | '2v2'
          team_a_player_ids?: string[]
          team_b_player_ids?: string[]
          score_a?: number
          score_b?: number
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Player = Database['public']['Tables']['players']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
