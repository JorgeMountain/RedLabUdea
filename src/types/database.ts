export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string
          display_name: string | null
          role: "student" | "teacher"
          created_at: string | null
        }
        Insert: {
          user_id: string
          display_name?: string | null
          role?: "student" | "teacher"
          created_at?: string | null
        }
        Update: {
          user_id?: string
          display_name?: string | null
          role?: "student" | "teacher"
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_items: {
        Row: {
          id: string
          name: string
          code: string | null
          category: string | null
          stock: number
          spec_summary: string | null
          datasheet_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          category?: string | null
          stock?: number
          spec_summary?: string | null
          datasheet_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          category?: string | null
          stock?: number
          spec_summary?: string | null
          datasheet_url?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      loan_requests: {
        Row: {
          id: string
          student_id: string
          purpose: string | null
          status: "pending" | "approved" | "rejected" | "returned"
          teacher_id: string | null
          decided_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          purpose?: string | null
          status?: "pending" | "approved" | "rejected" | "returned"
          teacher_id?: string | null
          decided_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          purpose?: string | null
          status?: "pending" | "approved" | "rejected" | "returned"
          teacher_id?: string | null
          decided_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_requests_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_request_items: {
        Row: {
          id: string
          request_id: string
          item_id: string
          quantity: number
        }
        Insert: {
          id?: string
          request_id: string
          item_id: string
          quantity: number
        }
        Update: {
          id?: string
          request_id?: string
          item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "loan_request_items_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "lab_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_request_items_request_id_fkey"
            columns: ["request_id"]
            referencedRelation: "loan_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_moves: {
        Row: {
          id: string
          item_id: string | null
          request_id: string | null
          delta: number
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          request_id?: string | null
          delta: number
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string | null
          request_id?: string | null
          delta?: number
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_moves_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "lab_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_request_id_fkey"
            columns: ["request_id"]
            referencedRelation: "loan_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_moves_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reservable_resources: {
        Row: {
          id: string
          name: string
          code: string | null
          location: string | null
          category: string | null
          description: string | null
          requires_approval: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          location?: string | null
          category?: string | null
          description?: string | null
          requires_approval?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          location?: string | null
          category?: string | null
          description?: string | null
          requires_approval?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          id: string
          resource_id: string
          student_id: string
          start_at: string
          end_at: string
          during: string
          status: "pending" | "approved" | "rejected" | "cancelled" | "done"
          teacher_id: string | null
          decided_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          resource_id: string
          student_id: string
          start_at: string
          end_at: string
          status?: "pending" | "approved" | "rejected" | "cancelled" | "done"
          teacher_id?: string | null
          decided_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          resource_id?: string
          student_id?: string
          start_at?: string
          end_at?: string
          status?: "pending" | "approved" | "rejected" | "cancelled" | "done"
          teacher_id?: string | null
          decided_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_resource_id_fkey"
            columns: ["resource_id"]
            referencedRelation: "reservable_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_teacher_id_fkey"
            columns: ["teacher_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
export type LabItemRow = Database["public"]["Tables"]["lab_items"]["Row"]
export type LoanRequestRow =
  Database["public"]["Tables"]["loan_requests"]["Row"]
export type LoanRequestItemRow =
  Database["public"]["Tables"]["loan_request_items"]["Row"]
export type StockMoveRow = Database["public"]["Tables"]["stock_moves"]["Row"]
export type ReservableResourceRow =
  Database["public"]["Tables"]["reservable_resources"]["Row"]
export type ReservationRow =
  Database["public"]["Tables"]["reservations"]["Row"]
