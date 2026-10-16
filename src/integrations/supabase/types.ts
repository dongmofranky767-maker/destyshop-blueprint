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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city_id: string | null
          created_at: string
          id: string
          label: string | null
          line1: string
          location: unknown
          user_id: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          line1: string
          location?: unknown
          user_id: string
        }
        Update: {
          city_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          line1?: string
          location?: unknown
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_logs: {
        Row: {
          context: Json | null
          created_at: string
          id: number
          level: string
          message: string
          source: string
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          id?: number
          level: string
          message: string
          source: string
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          id?: number
          level?: string
          message?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          data: Json | null
          entity: string
          entity_id: string | null
          id: number
          shop_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          data?: Json | null
          entity: string
          entity_id?: string | null
          id?: number
          shop_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          data?: Json | null
          entity?: string
          entity_id?: string | null
          id?: number
          shop_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          id: string
          name: string
          region_id: string
        }
        Insert: {
          id?: string
          name: string
          region_id: string
        }
        Update: {
          id?: string
          name?: string
          region_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          carrier: string | null
          courier_id: string | null
          created_at: string
          id: string
          mode: Database["public"]["Enums"]["fulfillment_mode"]
          order_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          tracking_ref: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          courier_id?: string | null
          created_at?: string
          id?: string
          mode: Database["public"]["Enums"]["fulfillment_mode"]
          order_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_ref?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          courier_id?: string | null
          created_at?: string
          id?: string
          mode?: Database["public"]["Enums"]["fulfillment_mode"]
          order_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          tracking_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      election_candidates: {
        Row: {
          created_at: string
          election_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          election_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          election_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "election_candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "election_candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          opened_by: string | null
          opens_at: string | null
          reason: string | null
          round: number
          shop_id: string
          status: Database["public"]["Enums"]["election_status"]
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          opened_by?: string | null
          opens_at?: string | null
          reason?: string | null
          round?: number
          shop_id: string
          status?: Database["public"]["Enums"]["election_status"]
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          opened_by?: string | null
          opens_at?: string | null
          reason?: string | null
          round?: number
          shop_id?: string
          status?: Database["public"]["Enums"]["election_status"]
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elections_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          employee_number: string | null
          hired_at: string | null
          id: string
          shop_id: string
          status: Database["public"]["Enums"]["account_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_number?: string | null
          hired_at?: string | null
          id?: string
          shop_id: string
          status?: Database["public"]["Enums"]["account_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          employee_number?: string | null
          hired_at?: string | null
          id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["account_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          alert_threshold: number
          quantity: number
          reserved: number
          shop_id: string
          updated_at: string
          variant_id: string
        }
        Insert: {
          alert_threshold?: number
          quantity?: number
          reserved?: number
          shop_id: string
          updated_at?: string
          variant_id: string
        }
        Update: {
          alert_threshold?: number
          quantity?: number
          reserved?: number
          shop_id?: string
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          quantity: number
          unit_price_xaf: number
          variant_id: string
        }
        Insert: {
          id?: string
          order_id: string
          quantity: number
          unit_price_xaf: number
          variant_id: string
        }
        Update: {
          id?: string
          order_id?: string
          quantity?: number
          unit_price_xaf?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          assigned_employee_id: string | null
          client_request_id: string | null
          created_at: string
          customer_id: string
          customer_note: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_mode"]
          id: string
          reference: string
          shop_id: string
          status: Database["public"]["Enums"]["order_status"]
          total_xaf: number
          updated_at: string
        }
        Insert: {
          address_id?: string | null
          assigned_employee_id?: string | null
          client_request_id?: string | null
          created_at?: string
          customer_id: string
          customer_note?: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_mode"]
          id?: string
          reference?: string
          shop_id: string
          status?: Database["public"]["Enums"]["order_status"]
          total_xaf?: number
          updated_at?: string
        }
        Update: {
          address_id?: string | null
          assigned_employee_id?: string | null
          client_request_id?: string | null
          created_at?: string
          customer_id?: string
          customer_note?: string | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_mode"]
          id?: string
          reference?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_xaf?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_xaf: number
          created_at: string
          external_ref: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string | null
          provider: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_xaf: number
          created_at?: string
          external_ref?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id?: string | null
          provider?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_xaf?: number
          created_at?: string
          external_ref?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string | null
          provider?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          id?: string
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          id: string
          is_active: boolean
          label: string | null
          price_xaf: number
          product_id: string
          sku: string
        }
        Insert: {
          barcode?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          price_xaf: number
          product_id: string
          sku: string
        }
        Update: {
          barcode?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          price_xaf?: number
          product_id?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_id: string
          comment: string | null
          created_at: string
          id: string
          product_id: string | null
          rating: number
          shop_id: string | null
          target: Database["public"]["Enums"]["review_target"]
        }
        Insert: {
          author_id: string
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rating: number
          shop_id?: string | null
          target: Database["public"]["Enums"]["review_target"]
        }
        Update: {
          author_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string | null
          rating?: number
          shop_id?: string | null
          target?: Database["public"]["Enums"]["review_target"]
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          id: string
          quantity: number
          sale_id: string
          unit_price_xaf: number
          variant_id: string
        }
        Insert: {
          id?: string
          quantity: number
          sale_id: string
          unit_price_xaf: number
          variant_id: string
        }
        Update: {
          id?: string
          quantity?: number
          sale_id?: string
          unit_price_xaf?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          channel: Database["public"]["Enums"]["sale_channel"]
          client_uuid: string | null
          created_at: string
          customer_id: string | null
          employee_id: string | null
          id: string
          order_id: string | null
          shop_id: string
          total_xaf: number
        }
        Insert: {
          channel: Database["public"]["Enums"]["sale_channel"]
          client_uuid?: string | null
          created_at?: string
          customer_id?: string | null
          employee_id?: string | null
          id?: string
          order_id?: string | null
          shop_id: string
          total_xaf?: number
        }
        Update: {
          channel?: Database["public"]["Enums"]["sale_channel"]
          client_uuid?: string | null
          created_at?: string
          customer_id?: string | null
          employee_id?: string | null
          id?: string
          order_id?: string | null
          shop_id?: string
          total_xaf?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_admin_mandates: {
        Row: {
          appointed_by: string | null
          election_id: string | null
          ended_at: string | null
          id: string
          origin: string
          revoked_reason: string | null
          shop_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          appointed_by?: string | null
          election_id?: string | null
          ended_at?: string | null
          id?: string
          origin: string
          revoked_reason?: string | null
          shop_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          appointed_by?: string | null
          election_id?: string | null
          ended_at?: string | null
          id?: string
          origin?: string
          revoked_reason?: string | null
          shop_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandates_election_fk"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_admin_mandates_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_admin_mandates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          city_id: string | null
          code: string
          created_at: string
          id: string
          location: unknown
          name: string
          opening_hours: Json
          phone: string | null
          status: Database["public"]["Enums"]["shop_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city_id?: string | null
          code: string
          created_at?: string
          id?: string
          location?: unknown
          name: string
          opening_hours?: Json
          phone?: string | null
          status?: Database["public"]["Enums"]["shop_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city_id?: string | null
          code?: string
          created_at?: string
          id?: string
          location?: unknown
          name?: string
          opening_hours?: Json
          phone?: string | null
          status?: Database["public"]["Enums"]["shop_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          actor_id: string | null
          created_at: string
          delta_quantity: number
          delta_reserved: number
          id: string
          idempotency_key: string | null
          reason: string | null
          ref_id: string | null
          ref_type: string | null
          shop_id: string
          type: Database["public"]["Enums"]["stock_movement_type"]
          variant_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta_quantity?: number
          delta_reserved?: number
          id?: string
          idempotency_key?: string | null
          reason?: string | null
          ref_id?: string | null
          ref_type?: string | null
          shop_id: string
          type: Database["public"]["Enums"]["stock_movement_type"]
          variant_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta_quantity?: number
          delta_reserved?: number
          id?: string
          idempotency_key?: string | null
          reason?: string | null
          ref_id?: string | null
          ref_type?: string | null
          shop_id?: string
          type?: Database["public"]["Enums"]["stock_movement_type"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_shop_id_variant_id_fkey"
            columns: ["shop_id", "variant_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["shop_id", "variant_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          candidate_id: string
          cast_at: string
          election_id: string
          id: string
          voter_id: string
        }
        Insert: {
          candidate_id: string
          cast_at?: string
          election_id: string
          id?: string
          voter_id: string
        }
        Update: {
          candidate_id?: string
          cast_at?: string
          election_id?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_stock_movement: {
        Args: {
          _delta_quantity: number
          _delta_reserved: number
          _idempotency_key?: string
          _reason?: string
          _ref_id?: string
          _ref_type?: string
          _shop_id: string
          _type: Database["public"]["Enums"]["stock_movement_type"]
          _variant_id: string
        }
        Returns: {
          alert_threshold: number
          quantity: number
          reserved: number
          shop_id: string
          updated_at: string
          variant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_my_order: { Args: { _order_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_shop_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _shop_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_network_admin: { Args: { _user_id: string }; Returns: boolean }
      is_shop_staff: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      nearby_shops: {
        Args: { _lat?: number; _lng?: number }
        Returns: {
          address: string
          city: string
          code: string
          distance_km: number
          id: string
          lat: number
          lng: number
          name: string
          phone: string
        }[]
      }
      place_order: {
        Args: {
          _address_id: string
          _fulfillment: Database["public"]["Enums"]["fulfillment_mode"]
          _items: Json
          _note?: string
          _request_id: string
          _shop_id: string
        }
        Returns: string
      }
      product_stats: {
        Args: never
        Returns: {
          avg_rating: number
          product_id: string
          review_count: number
          sold_qty: number
        }[]
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "disabled"
      app_role:
        | "client"
        | "employee"
        | "shop_admin"
        | "network_admin"
        | "it_admin"
      delivery_status:
        | "pending"
        | "preparing"
        | "in_transit"
        | "delivered"
        | "failed"
      election_status:
        | "draft"
        | "open"
        | "closed"
        | "validated"
        | "rerun"
        | "cancelled"
      fulfillment_mode: "pickup" | "shipping" | "home_delivery"
      order_status:
        | "pending"
        | "paid"
        | "preparing"
        | "ready"
        | "in_transit"
        | "delivered"
        | "picked_up"
        | "cancelled"
      payment_method: "cash" | "orange_money" | "mtn_momo" | "card"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
      review_target: "product" | "shop"
      sale_channel: "online" | "pos"
      shop_status: "draft" | "active" | "closed"
      stock_movement_type:
        | "sale_online"
        | "sale_pos"
        | "restock"
        | "adjustment"
        | "return"
        | "reservation"
        | "release"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "disabled"],
      app_role: [
        "client",
        "employee",
        "shop_admin",
        "network_admin",
        "it_admin",
      ],
      delivery_status: [
        "pending",
        "preparing",
        "in_transit",
        "delivered",
        "failed",
      ],
      election_status: [
        "draft",
        "open",
        "closed",
        "validated",
        "rerun",
        "cancelled",
      ],
      fulfillment_mode: ["pickup", "shipping", "home_delivery"],
      order_status: [
        "pending",
        "paid",
        "preparing",
        "ready",
        "in_transit",
        "delivered",
        "picked_up",
        "cancelled",
      ],
      payment_method: ["cash", "orange_money", "mtn_momo", "card"],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
      review_target: ["product", "shop"],
      sale_channel: ["online", "pos"],
      shop_status: ["draft", "active", "closed"],
      stock_movement_type: [
        "sale_online",
        "sale_pos",
        "restock",
        "adjustment",
        "return",
        "reservation",
        "release",
      ],
    },
  },
} as const
