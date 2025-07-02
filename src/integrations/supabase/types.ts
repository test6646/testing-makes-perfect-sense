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
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          firm_id: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          firm_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          advance_amount: number | null
          balance_amount: number | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          firm_id: string | null
          id: string
          photographer_id: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          total_amount: number | null
          updated_at: string
          venue: string | null
          videographer_id: string | null
        }
        Insert: {
          advance_amount?: number | null
          balance_amount?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          firm_id?: string | null
          id?: string
          photographer_id?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          total_amount?: number | null
          updated_at?: string
          venue?: string | null
          videographer_id?: string | null
        }
        Update: {
          advance_amount?: number | null
          balance_amount?: number | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          firm_id?: string | null
          id?: string
          photographer_id?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          total_amount?: number | null
          updated_at?: string
          venue?: string | null
          videographer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_photographer_id_fkey"
            columns: ["photographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_videographer_id_fkey"
            columns: ["videographer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string
          event_id: string | null
          expense_date: string
          firm_id: string | null
          id: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description: string
          event_id?: string | null
          expense_date?: string
          firm_id?: string | null
          id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          event_id?: string | null
          expense_date?: string
          firm_id?: string | null
          id?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          spreadsheet_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          spreadsheet_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          spreadsheet_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          firm_id: string | null
          id: string
          message: string
          read: boolean | null
          related_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          id?: string
          message: string
          read?: boolean | null
          related_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          id?: string
          message?: string
          read?: boolean | null
          related_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          event_id: string | null
          firm_id: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          firm_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          firm_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          firm_id: string | null
          full_name: string
          id: string
          mobile_number: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          firm_id?: string | null
          full_name: string
          id?: string
          mobile_number: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          firm_id?: string | null
          full_name?: string
          id?: string
          mobile_number?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          amount: number
          client_id: string | null
          converted_to_event: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          firm_id: string | null
          id: string
          title: string
          updated_at: string
          valid_until: string | null
          venue: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          converted_to_event?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          firm_id?: string | null
          id?: string
          title: string
          updated_at?: string
          valid_until?: string | null
          venue?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          converted_to_event?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          firm_id?: string | null
          id?: string
          title?: string
          updated_at?: string
          valid_until?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_converted_to_event_fkey"
            columns: ["converted_to_event"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string | null
          firm_id: string | null
          id: string
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          staff_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          firm_id?: string | null
          id?: string
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          staff_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          firm_id?: string | null
          id?: string
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          staff_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          event_id: string | null
          firm_id: string | null
          id: string
          priority: number | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          firm_id?: string | null
          id?: string
          priority?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string | null
          firm_id?: string | null
          id?: string
          priority?: number | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      event_status:
        | "Quotation"
        | "Confirmed"
        | "Shooting"
        | "Editing"
        | "Delivered"
        | "Cancelled"
      event_type:
        | "Wedding"
        | "Pre-Wedding"
        | "Birthday"
        | "Corporate"
        | "Product"
        | "Portrait"
        | "Other"
      expense_category:
        | "Equipment"
        | "Travel"
        | "Accommodation"
        | "Food"
        | "Marketing"
        | "Software"
        | "Maintenance"
        | "Salary"
        | "Other"
      notification_type:
        | "Task_Assigned"
        | "Task_Updated"
        | "Payment_Received"
        | "Event_Updated"
        | "Deadline_Reminder"
        | "System_Alert"
      payment_method: "Cash" | "UPI" | "Bank Transfer" | "Card" | "Cheque"
      payment_status: "Pending" | "Paid" | "Partial" | "Overdue"
      task_status: "Pending" | "In Progress" | "Completed" | "On Hold"
      task_type:
        | "Photography"
        | "Videography"
        | "Photo Editing"
        | "Video Editing"
        | "Delivery"
        | "Client Meeting"
        | "Other"
      user_role: "Admin" | "Photographer" | "Videographer" | "Editor" | "Other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_status: [
        "Quotation",
        "Confirmed",
        "Shooting",
        "Editing",
        "Delivered",
        "Cancelled",
      ],
      event_type: [
        "Wedding",
        "Pre-Wedding",
        "Birthday",
        "Corporate",
        "Product",
        "Portrait",
        "Other",
      ],
      expense_category: [
        "Equipment",
        "Travel",
        "Accommodation",
        "Food",
        "Marketing",
        "Software",
        "Maintenance",
        "Salary",
        "Other",
      ],
      notification_type: [
        "Task_Assigned",
        "Task_Updated",
        "Payment_Received",
        "Event_Updated",
        "Deadline_Reminder",
        "System_Alert",
      ],
      payment_method: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque"],
      payment_status: ["Pending", "Paid", "Partial", "Overdue"],
      task_status: ["Pending", "In Progress", "Completed", "On Hold"],
      task_type: [
        "Photography",
        "Videography",
        "Photo Editing",
        "Video Editing",
        "Delivery",
        "Client Meeting",
        "Other",
      ],
      user_role: ["Admin", "Photographer", "Videographer", "Editor", "Other"],
    },
  },
} as const
