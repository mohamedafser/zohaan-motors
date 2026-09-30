/**
 * Minimal Database typing for Supabase clients.
 * Prefer regenerating with `npm run db:types` after local migrations.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type GenericTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          employee_code: string | null;
          first_name: string;
          last_name: string;
          display_name: string;
          phone: string | null;
          avatar_url: string | null;
          branch_id: string | null;
          status: "active" | "invited" | "suspended" | "disabled";
          deleted_at: string | null;
          deleted_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          display_name: string;
          employee_code?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          branch_id?: string | null;
          status?: "active" | "invited" | "suspended" | "disabled";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          branch_id: string | null;
          assigned_by: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role_id: string;
          branch_id?: string | null;
          assigned_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Row"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          name: string;
          description?: string | null;
          is_system?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Row"]>;
        Relationships: [];
      };
      branches: GenericTable;
      permissions: GenericTable;
      role_permissions: GenericTable;
      vehicles: GenericTable;
      vehicle_expenses: GenericTable;
      acquisitions: GenericTable;
      inspections: GenericTable;
      workshop_orders: GenericTable;
      customers: GenericTable;
      leads: GenericTable;
      reservations: GenericTable;
      sales: GenericTable;
      payments: GenericTable;
      invoices: GenericTable;
      documents: GenericTable;
      notifications: GenericTable;
      audit_logs: GenericTable;
    };
    Views: Record<string, never>;
    Functions: {
      current_user_permissions: { Args: Record<PropertyKey, never>; Returns: string[] };
      current_user_roles: { Args: Record<PropertyKey, never>; Returns: string[] };
      activate_invited_profile: { Args: Record<PropertyKey, never>; Returns: undefined };
      assign_user_role: {
        Args: {
          target_user_id: string;
          role_key: string;
          target_branch_id?: string | null;
        };
        Returns: string;
      };
      revoke_user_role: { Args: { assignment_id: string }; Returns: undefined };
      has_permission: { Args: { permission_key: string }; Returns: boolean };
      read_vehicle_costs: {
        Args: { p_vehicle_id: string };
        Returns: {
          total_acquisition_cost: number;
          minimum_selling_price: number | null;
        }[];
      };
      read_vehicle_profit: {
        Args: { p_vehicle_id: string };
        Returns: {
          total_acquisition_cost: number;
          current_selling_price: number | null;
          minimum_selling_price: number | null;
          estimated_margin: number | null;
        }[];
      };
      update_vehicle_costs: {
        Args: {
          p_vehicle_id: string;
          p_total_acquisition_cost?: number | null;
          p_minimum_selling_price?: number | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      user_status: "active" | "invited" | "suspended" | "disabled";
    };
    CompositeTypes: Record<string, never>;
  };
};
