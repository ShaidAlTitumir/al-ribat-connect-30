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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          business_id: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_deletion_requests: {
        Row: {
          business_id: string
          created_at: string
          id: string
          requested_by: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          requested_by: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_deletion_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_deletion_votes: {
        Row: {
          created_at: string
          id: string
          request_id: string
          user_id: string
          vote: string
          voted_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          user_id: string
          vote?: string
          voted_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
          vote?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_deletion_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "business_deletion_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          business_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          business_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          business_type: string | null
          cash_balance: number | null
          created_at: string
          default_currency: string
          description: string | null
          exchange_rate: number
          id: string
          join_code: string | null
          manual_value: number | null
          name: string
          owner_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          cash_balance?: number | null
          created_at?: string
          default_currency?: string
          description?: string | null
          exchange_rate?: number
          id?: string
          join_code?: string | null
          manual_value?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_type?: string | null
          cash_balance?: number | null
          created_at?: string
          default_currency?: string
          description?: string | null
          exchange_rate?: number
          id?: string
          join_code?: string | null
          manual_value?: number | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      capital_contributions: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          id: string
          notes: string | null
          partner_id: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          partner_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          partner_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_contributions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_contributions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_ledger: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          customer_id: string
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          customer_id: string
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_ledger_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          id: string
          name: string
          phone: string | null
          shop_name: string | null
          total_due: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          shop_name?: string | null
          total_due?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          shop_name?: string | null
          total_due?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      exchanges: {
        Row: {
          amount_from: number
          amount_to: number
          business_id: string
          created_at: string
          from_currency: string
          id: string
          rate: number
          to_currency: string
          user_id: string | null
        }
        Insert: {
          amount_from: number
          amount_to: number
          business_id: string
          created_at?: string
          from_currency: string
          id?: string
          rate: number
          to_currency: string
          user_id?: string | null
        }
        Update: {
          amount_from?: number
          amount_to?: number
          business_id?: string
          created_at?: string
          from_currency?: string
          id?: string
          rate?: number
          to_currency?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchanges_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          business_id: string
          category: string | null
          created_at: string
          currency: string
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          category?: string | null
          created_at?: string
          currency?: string
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string | null
          created_at?: string
          currency?: string
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          current_stock: number
          default_selling_price: number | null
          id: string
          low_stock_threshold: number
          name: string
          updated_at: string
          user_id: string | null
          weight_per_unit: number
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          current_stock?: number
          default_selling_price?: number | null
          id?: string
          low_stock_threshold?: number
          name: string
          updated_at?: string
          user_id?: string | null
          weight_per_unit?: number
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          current_stock?: number
          default_selling_price?: number | null
          id?: string
          low_stock_threshold?: number
          name?: string
          updated_at?: string
          user_id?: string | null
          weight_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leave_requests: {
        Row: {
          business_id: string
          created_at: string
          id: string
          partner_id: string
          requested_by: string
          settlement_amount: number | null
          settlement_currency: string | null
          settlement_notes: string | null
          status: string
          type: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          partner_id: string
          requested_by: string
          settlement_amount?: number | null
          settlement_currency?: string | null
          settlement_notes?: string | null
          status?: string
          type?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          partner_id?: string
          requested_by?: string
          settlement_amount?: number | null
          settlement_currency?: string | null
          settlement_notes?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_leave_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_leave_requests_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leave_votes: {
        Row: {
          created_at: string
          id: string
          request_id: string
          user_id: string
          vote: string
          voted_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          request_id: string
          user_id: string
          vote?: string
          voted_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          request_id?: string
          user_id?: string
          vote?: string
          voted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_leave_votes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "partner_leave_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_transfers: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          from_partner_id: string
          id: string
          method: string
          notes: string | null
          to_partner_id: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          currency?: string
          from_partner_id: string
          id?: string
          method?: string
          notes?: string | null
          to_partner_id: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          from_partner_id?: string
          id?: string
          method?: string
          notes?: string | null
          to_partner_id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_transfers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_transfers_from_partner_id_fkey"
            columns: ["from_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_transfers_to_partner_id_fkey"
            columns: ["to_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          business_id: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          invitation_code: string
          invited_by: string | null
          name: string
          phone: string | null
          profit_share: number
          role: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          business_id?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invitation_code: string
          invited_by?: string | null
          name: string
          phone?: string | null
          profit_share?: number
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          business_id?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invitation_code?: string
          invited_by?: string | null
          name?: string
          phone?: string | null
          profit_share?: number
          role?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_id: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_transactions: {
        Row: {
          additional_cost_bdt: number
          business_id: string
          buying_cost_per_unit_rmb: number
          created_at: string
          exchange_rate_used: number
          id: string
          item_id: string
          landed_cost_per_unit_bdt: number
          quantity: number
          shipping_method: string
          shipping_rate_bdt_per_kg: number
          total_landed_cost_bdt: number
          user_id: string | null
        }
        Insert: {
          additional_cost_bdt?: number
          business_id: string
          buying_cost_per_unit_rmb?: number
          created_at?: string
          exchange_rate_used?: number
          id?: string
          item_id: string
          landed_cost_per_unit_bdt?: number
          quantity: number
          shipping_method?: string
          shipping_rate_bdt_per_kg?: number
          total_landed_cost_bdt?: number
          user_id?: string | null
        }
        Update: {
          additional_cost_bdt?: number
          business_id?: string
          buying_cost_per_unit_rmb?: number
          created_at?: string
          exchange_rate_used?: number
          id?: string
          item_id?: string
          landed_cost_per_unit_bdt?: number
          quantity?: number
          shipping_method?: string
          shipping_rate_bdt_per_kg?: number
          total_landed_cost_bdt?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string | null
          id: string
          item_id: string
          quantity: number
          reason: string | null
          refund_amount: number
          sale_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          item_id: string
          quantity: number
          reason?: string | null
          refund_amount?: number
          sale_id?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          item_id?: string
          quantity?: number
          reason?: string | null
          refund_amount?: number
          sale_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          business_id: string
          cost_rate: number
          created_at: string
          customer_id: string | null
          due: number
          expected_profit: number
          id: string
          item_id: string
          quantity: number
          received_now_bdt: number
          unit_price_bdt: number
          user_id: string | null
        }
        Insert: {
          business_id: string
          cost_rate?: number
          created_at?: string
          customer_id?: string | null
          due?: number
          expected_profit?: number
          id?: string
          item_id: string
          quantity: number
          received_now_bdt?: number
          unit_price_bdt: number
          user_id?: string | null
        }
        Update: {
          business_id?: string
          cost_rate?: number
          created_at?: string
          customer_id?: string | null
          due?: number
          expected_profit?: number
          id?: string
          item_id?: string
          quantity?: number
          received_now_bdt?: number
          unit_price_bdt?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_orders: {
        Row: {
          business_id: string
          cost_rmb: number
          created_at: string
          customer_name: string | null
          id: string
          item_name: string
          notes: string | null
          quantity: number
          status: string
          supplier_name: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          cost_rmb?: number
          created_at?: string
          customer_name?: string | null
          id?: string
          item_name: string
          notes?: string | null
          quantity?: number
          status?: string
          supplier_name?: string | null
          type?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          cost_rmb?: number
          created_at?: string
          customer_name?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          quantity?: number
          status?: string
          supplier_name?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sample_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_partner_to_business: {
        Args: { _business_id: string; _role: string; _target_user_id: string }
        Returns: undefined
      }
      get_user_business_id: { Args: { _user_id: string }; Returns: string }
      user_can_access_business: {
        Args: { _business_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
