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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ad_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ad_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          alley: string | null
          building_number: string | null
          city: string | null
          created_at: string
          description: string | null
          district: string | null
          floor: string | null
          id: string
          is_default: boolean
          latitude: number | null
          longitude: number | null
          neighborhood: string | null
          postal_code: string | null
          province: string | null
          street: string | null
          title: string | null
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alley?: string | null
          building_number?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          floor?: string | null
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          postal_code?: string | null
          province?: string | null
          street?: string | null
          title?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alley?: string | null
          building_number?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          floor?: string | null
          id?: string
          is_default?: boolean
          latitude?: number | null
          longitude?: number | null
          neighborhood?: string | null
          postal_code?: string | null
          province?: string | null
          street?: string | null
          title?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          category_id: string | null
          city: string | null
          clicks_count: number
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          images: Json
          is_free: boolean
          price: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
          views_count: number
        }
        Insert: {
          category_id?: string | null
          city?: string | null
          clicks_count?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          images?: Json
          is_free?: boolean
          price?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          views_count?: number
        }
        Update: {
          category_id?: string | null
          city?: string | null
          clicks_count?: number
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          images?: Json
          is_free?: boolean
          price?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ad_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_logs: {
        Row: {
          created_at: string
          id: string
          model: string | null
          prompt: string | null
          response: Json | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model?: string | null
          prompt?: string | null
          response?: Json | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model?: string | null
          prompt?: string | null
          response?: Json | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          device: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          platform: string | null
          session_id: string | null
          store_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          platform?: string | null
          session_id?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          platform?: string | null
          session_id?: string | null
          store_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "analytics_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          category: string
          created_at: string
          criteria: Json
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          category: string
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      collection_items: {
        Row: {
          collection_id: string | null
          created_at: string | null
          id: string
          inspiration_id: string | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          inspiration_id?: string | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          inspiration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "user_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_inspiration_id_fkey"
            columns: ["inspiration_id"]
            isOneToOne: false
            referencedRelation: "inspirations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_messages: {
        Row: {
          attachments: Json
          body: string
          consultation_id: string
          created_at: string
          id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          attachments?: Json
          body: string
          consultation_id: string
          created_at?: string
          id?: string
          sender_id: string
          sender_role: string
        }
        Update: {
          attachments?: Json
          body?: string
          consultation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_messages_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          attachments: Json
          budget_max: number | null
          budget_min: number | null
          city: string | null
          completed_at: string | null
          consultation_type: Database["public"]["Enums"]["consultation_type"]
          created_at: string
          customer_id: string
          customer_name: string
          customer_phone: string
          description: string | null
          designer_id: string | null
          designer_note: string | null
          final_price: number | null
          id: string
          room_type: string | null
          status: Database["public"]["Enums"]["consultation_status"]
          style_preference: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          completed_at?: string | null
          consultation_type?: Database["public"]["Enums"]["consultation_type"]
          created_at?: string
          customer_id: string
          customer_name: string
          customer_phone: string
          description?: string | null
          designer_id?: string | null
          designer_note?: string | null
          final_price?: number | null
          id?: string
          room_type?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          style_preference?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          completed_at?: string | null
          consultation_type?: Database["public"]["Enums"]["consultation_type"]
          created_at?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          description?: string | null
          designer_id?: string | null
          designer_note?: string | null
          final_price?: number | null
          id?: string
          room_type?: string | null
          status?: Database["public"]["Enums"]["consultation_status"]
          style_preference?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "designers"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          min_purchase_amount: number | null
          start_date: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_purchase_amount?: number | null
          start_date?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          min_purchase_amount?: number | null
          start_date?: string | null
        }
        Relationships: []
      }
      designer_portfolio: {
        Row: {
          created_at: string
          description: string | null
          designer_id: string
          id: string
          image_url: string | null
          location: string | null
          project_type: string | null
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          designer_id: string
          id?: string
          image_url?: string | null
          location?: string | null
          project_type?: string | null
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          designer_id?: string
          id?: string
          image_url?: string | null
          location?: string | null
          project_type?: string | null
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "designer_portfolio_designer_id_fkey"
            columns: ["designer_id"]
            isOneToOne: false
            referencedRelation: "designers"
            referencedColumns: ["id"]
          },
        ]
      }
      designers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          rating: number
          specialties: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          rating?: number
          specialties?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          rating?: number
          specialties?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      designs: {
        Row: {
          consultation: string | null
          created_at: string
          id: string
          room_id: string
          style: string | null
          total_price: number | null
        }
        Insert: {
          consultation?: string | null
          created_at?: string
          id?: string
          room_id: string
          style?: string | null
          total_price?: number | null
        }
        Update: {
          consultation?: string | null
          created_at?: string
          id?: string
          room_id?: string
          style?: string | null
          total_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "designs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      inspiration_products: {
        Row: {
          created_at: string | null
          id: string
          inspiration_id: string | null
          product_id: string | null
          x_position: number
          y_position: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          inspiration_id?: string | null
          product_id?: string | null
          x_position: number
          y_position: number
        }
        Update: {
          created_at?: string | null
          id?: string
          inspiration_id?: string | null
          product_id?: string | null
          x_position?: number
          y_position?: number
        }
        Relationships: [
          {
            foreignKeyName: "inspiration_products_inspiration_id_fkey"
            columns: ["inspiration_id"]
            isOneToOne: false
            referencedRelation: "inspirations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspiration_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_analytics_mv"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inspiration_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_analytics_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inspiration_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inspiration_uploads: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string
          status: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      inspirations: {
        Row: {
          ai_processed: boolean | null
          ai_translated: boolean | null
          budget_range_max: number | null
          budget_range_min: number | null
          color_palette: Json | null
          created_at: string | null
          description: string | null
          description_fa: string | null
          id: string
          image_url: string
          room_type: Database["public"]["Enums"]["inspiration_room_type"] | null
          save_count: number | null
          source_name: string | null
          source_rss_feed: string | null
          source_url: string | null
          style: Database["public"]["Enums"]["inspiration_style"] | null
          tags: string[] | null
          title: string
          title_fa: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          ai_processed?: boolean | null
          ai_translated?: boolean | null
          budget_range_max?: number | null
          budget_range_min?: number | null
          color_palette?: Json | null
          created_at?: string | null
          description?: string | null
          description_fa?: string | null
          id?: string
          image_url: string
          room_type?:
            | Database["public"]["Enums"]["inspiration_room_type"]
            | null
          save_count?: number | null
          source_name?: string | null
          source_rss_feed?: string | null
          source_url?: string | null
          style?: Database["public"]["Enums"]["inspiration_style"] | null
          tags?: string[] | null
          title: string
          title_fa?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          ai_processed?: boolean | null
          ai_translated?: boolean | null
          budget_range_max?: number | null
          budget_range_min?: number | null
          color_palette?: Json | null
          created_at?: string | null
          description?: string | null
          description_fa?: string | null
          id?: string
          image_url?: string
          room_type?:
            | Database["public"]["Enums"]["inspiration_room_type"]
            | null
          save_count?: number | null
          source_name?: string | null
          source_rss_feed?: string | null
          source_url?: string | null
          style?: Database["public"]["Enums"]["inspiration_style"] | null
          tags?: string[] | null
          title?: string
          title_fa?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      installer_bookings: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          customer_id: string
          customer_name: string
          customer_phone: string
          description: string | null
          final_price: number | null
          id: string
          installer_id: string
          installer_note: string | null
          preferred_date: string | null
          preferred_time_range: string | null
          specialty: Database["public"]["Enums"]["installer_specialty"]
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_id: string
          customer_name: string
          customer_phone: string
          description?: string | null
          final_price?: number | null
          id?: string
          installer_id: string
          installer_note?: string | null
          preferred_date?: string | null
          preferred_time_range?: string | null
          specialty: Database["public"]["Enums"]["installer_specialty"]
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          description?: string | null
          final_price?: number | null
          id?: string
          installer_id?: string
          installer_note?: string | null
          preferred_date?: string | null
          preferred_time_range?: string | null
          specialty?: Database["public"]["Enums"]["installer_specialty"]
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: []
      }
      installers: {
        Row: {
          avatar_url: string | null
          base_rate: number | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          phone: string | null
          rating: number
          specialties: Database["public"]["Enums"]["installer_specialty"][]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          base_rate?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          rating?: number
          specialties?: Database["public"]["Enums"]["installer_specialty"][]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          base_rate?: number | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          rating?: number
          specialties?: Database["public"]["Enums"]["installer_specialty"][]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          read_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          read_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          read_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          design_updates: boolean
          email: boolean
          id: string
          in_app: boolean
          marketing: boolean
          order_updates: boolean
          push: boolean
          sms: boolean
          system_alerts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          design_updates?: boolean
          email?: boolean
          id?: string
          in_app?: boolean
          marketing?: boolean
          order_updates?: boolean
          push?: boolean
          sms?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          design_updates?: boolean
          email?: boolean
          id?: string
          in_app?: boolean
          marketing?: boolean
          order_updates?: boolean
          push?: boolean
          sms?: boolean
          system_alerts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          store_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          store_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          store_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          city: string | null
          created_at: string
          customer_id: string
          id: string
          note: string | null
          phone: string
          profile_id: string
          recipient_name: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          customer_id: string
          id?: string
          note?: string | null
          phone: string
          profile_id: string
          recipient_name: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          note?: string | null
          phone?: string
          profile_id?: string
          recipient_name?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      placements: {
        Row: {
          confidence: number | null
          created_at: string
          design_id: string
          id: string
          product_id: string
          reason: string | null
          rotation: number | null
          scale: number | null
          x: number
          y: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          design_id: string
          id?: string
          product_id: string
          reason?: string | null
          rotation?: number | null
          scale?: number | null
          x: number
          y: number
        }
        Update: {
          confidence?: number | null
          created_at?: string
          design_id?: string
          id?: string
          product_id?: string
          reason?: string | null
          rotation?: number | null
          scale?: number | null
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "placements_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_analytics_mv"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "placements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_analytics_view"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "placements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_quotes: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          product_id: string | null
          product_name: string | null
          profile_id: string | null
          proposed_price: number | null
          quantity: number | null
          request_type: Database["public"]["Enums"]["quote_request_type"]
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          profile_id?: string | null
          proposed_price?: number | null
          quantity?: number | null
          request_type?: Database["public"]["Enums"]["quote_request_type"]
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          profile_id?: string | null
          proposed_price?: number | null
          quantity?: number | null
          request_type?: Database["public"]["Enums"]["quote_request_type"]
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Relationships: []
      }
      producer_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          ai_ready_url: string | null
          attributes: Json
          category: string
          category_id: string | null
          created_at: string
          depth: number | null
          description: string | null
          featured_until: string | null
          height: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          name: string
          price: number | null
          profile_id: string | null
          rating: number
          search_vector: unknown
          stock: number
          store_id: string | null
          style: string | null
          tags: string[] | null
          width: number | null
        }
        Insert: {
          ai_ready_url?: string | null
          attributes?: Json
          category?: string
          category_id?: string | null
          created_at?: string
          depth?: number | null
          description?: string | null
          featured_until?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name: string
          price?: number | null
          profile_id?: string | null
          rating?: number
          search_vector?: unknown
          stock?: number
          store_id?: string | null
          style?: string | null
          tags?: string[] | null
          width?: number | null
        }
        Update: {
          ai_ready_url?: string | null
          attributes?: Json
          category?: string
          category_id?: string | null
          created_at?: string
          depth?: number | null
          description?: string | null
          featured_until?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          name?: string
          price?: number | null
          profile_id?: string | null
          rating?: number
          search_vector?: unknown
          stock?: number
          store_id?: string | null
          style?: string | null
          tags?: string[] | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "producer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area_sqm: number | null
          avatar_url: string | null
          birth_date: string | null
          construction_year: number | null
          contact_published: boolean
          contact_published_at: string | null
          created_at: string
          favorite_colors: string[]
          first_name: string | null
          free_designs_limit: number
          free_designs_used: number
          full_name: string | null
          id: string
          is_blocked: boolean
          last_name: string | null
          phone: string | null
          phone_verified: boolean
          preferred_budget: number | null
          preferred_style: string | null
          property_type: string | null
          role: string
          room_count: number | null
          secondary_phone: string | null
          token_balance: number
        }
        Insert: {
          area_sqm?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          construction_year?: number | null
          contact_published?: boolean
          contact_published_at?: string | null
          created_at?: string
          favorite_colors?: string[]
          first_name?: string | null
          free_designs_limit?: number
          free_designs_used?: number
          full_name?: string | null
          id: string
          is_blocked?: boolean
          last_name?: string | null
          phone?: string | null
          phone_verified?: boolean
          preferred_budget?: number | null
          preferred_style?: string | null
          property_type?: string | null
          role?: string
          room_count?: number | null
          secondary_phone?: string | null
          token_balance?: number
        }
        Update: {
          area_sqm?: number | null
          avatar_url?: string | null
          birth_date?: string | null
          construction_year?: number | null
          contact_published?: boolean
          contact_published_at?: string | null
          created_at?: string
          favorite_colors?: string[]
          first_name?: string | null
          free_designs_limit?: number
          free_designs_used?: number
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          last_name?: string | null
          phone?: string | null
          phone_verified?: boolean
          preferred_budget?: number | null
          preferred_style?: string | null
          property_type?: string | null
          role?: string
          room_count?: number | null
          secondary_phone?: string | null
          token_balance?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_verified_purchase: boolean
          profile_id: string
          rating: number
          target_id: string
          target_type: Database["public"]["Enums"]["review_target"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          profile_id: string
          rating: number
          target_id: string
          target_type: Database["public"]["Enums"]["review_target"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_verified_purchase?: boolean
          profile_id?: string
          rating?: number
          target_id?: string
          target_type?: Database["public"]["Enums"]["review_target"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          budget: number | null
          created_at: string
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      second_hand_listings: {
        Row: {
          bumped_at: string | null
          category: string | null
          city: string | null
          created_at: string
          description: string | null
          featured_until: string | null
          id: string
          image_url: string | null
          is_blocked: boolean
          is_featured: boolean
          is_urgent: boolean
          phone: string | null
          price: number | null
          title: string
          urgent_until: string | null
          user_id: string
        }
        Insert: {
          bumped_at?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_blocked?: boolean
          is_featured?: boolean
          is_urgent?: boolean
          phone?: string | null
          price?: number | null
          title: string
          urgent_until?: string | null
          user_id: string
        }
        Update: {
          bumped_at?: string | null
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_blocked?: boolean
          is_featured?: boolean
          is_urgent?: boolean
          phone?: string | null
          price?: number | null
          title?: string
          urgent_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seller_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          store_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          store_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_badges_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "seller_badges_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          address: string | null
          created_at: string
          id: string
          notes: string | null
          preferred_date: string | null
          preferred_time: string | null
          purpose: Database["public"]["Enums"]["visit_purpose"]
          status: Database["public"]["Enums"]["visit_status"]
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          purpose?: Database["public"]["Enums"]["visit_purpose"]
          status?: Database["public"]["Enums"]["visit_status"]
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          purpose?: Database["public"]["Enums"]["visit_purpose"]
          status?: Database["public"]["Enums"]["visit_status"]
          user_id?: string
        }
        Relationships: []
      }
      store_daily_stats: {
        Row: {
          ai_recommendations: number
          clicks: number
          created_at: string
          date: string
          favorites: number
          id: string
          orders_count: number
          revenue: number
          store_id: string
          unique_visitors: number
          views: number
        }
        Insert: {
          ai_recommendations?: number
          clicks?: number
          created_at?: string
          date: string
          favorites?: number
          id?: string
          orders_count?: number
          revenue?: number
          store_id: string
          unique_visitors?: number
          views?: number
        }
        Update: {
          ai_recommendations?: number
          clicks?: number
          created_at?: string
          date?: string
          favorites?: number
          id?: string
          orders_count?: number
          revenue?: number
          store_id?: string
          unique_visitors?: number
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_daily_stats_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_health_checks: {
        Row: {
          checked_at: string
          id: string
          low_ai_recommendation: boolean
          low_ctr: boolean
          missing_colors: boolean
          missing_dimensions: boolean
          missing_material: boolean
          outdated_prices: boolean
          overall_score: number
          poor_quality_images: boolean
          products_no_category: boolean
          store_id: string
          suggestions: Json
        }
        Insert: {
          checked_at?: string
          id?: string
          low_ai_recommendation?: boolean
          low_ctr?: boolean
          missing_colors?: boolean
          missing_dimensions?: boolean
          missing_material?: boolean
          outdated_prices?: boolean
          overall_score?: number
          poor_quality_images?: boolean
          products_no_category?: boolean
          store_id: string
          suggestions?: Json
        }
        Update: {
          checked_at?: string
          id?: string
          low_ai_recommendation?: boolean
          low_ctr?: boolean
          missing_colors?: boolean
          missing_dimensions?: boolean
          missing_material?: boolean
          outdated_prices?: boolean
          overall_score?: number
          poor_quality_images?: boolean
          products_no_category?: boolean
          store_id?: string
          suggestions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "store_health_checks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_health_checks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string | null
          started_at: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string | null
          started_at?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_trust_scores: {
        Row: {
          activity_score: number
          ai_recommendation_score: number
          badges: string[]
          calculated_at: string
          has_active_subscription: boolean
          has_verified_info: boolean
          id: string
          overall_score: number
          product_completeness: number
          product_quality_score: number
          profile_completed: boolean
          store_age_days: number
          store_id: string
          updated_at: string
        }
        Insert: {
          activity_score?: number
          ai_recommendation_score?: number
          badges?: string[]
          calculated_at?: string
          has_active_subscription?: boolean
          has_verified_info?: boolean
          id?: string
          overall_score?: number
          product_completeness?: number
          product_quality_score?: number
          profile_completed?: boolean
          store_age_days?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          activity_score?: number
          ai_recommendation_score?: number
          badges?: string[]
          calculated_at?: string
          has_active_subscription?: boolean
          has_verified_info?: boolean
          id?: string
          overall_score?: number
          product_completeness?: number
          product_quality_score?: number
          profile_completed?: boolean
          store_age_days?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_trust_scores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_trust_scores_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          city: string | null
          contact_name: string | null
          contact_published: boolean
          contact_published_at: string | null
          created_at: string
          description: string | null
          id: string
          is_blocked: boolean
          name: string
          owner_id: string
          phone: string | null
          rating: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          contact_published?: boolean
          contact_published_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean
          name: string
          owner_id: string
          phone?: string | null
          rating?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_name?: string | null
          contact_published?: boolean
          contact_published_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean
          name?: string
          owner_id?: string
          phone?: string | null
          rating?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          has_analytics: boolean
          id: string
          is_active: boolean
          max_advertisements: number | null
          max_ai_designs: number | null
          max_featured: number
          max_products: number | null
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          sort_order: number
          storage_limit_mb: number | null
          tagline: string | null
        }
        Insert: {
          created_at?: string
          features?: Json
          has_analytics?: boolean
          id?: string
          is_active?: boolean
          max_advertisements?: number | null
          max_ai_designs?: number | null
          max_featured?: number
          max_products?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          slug: string
          sort_order?: number
          storage_limit_mb?: number | null
          tagline?: string | null
        }
        Update: {
          created_at?: string
          features?: Json
          has_analytics?: boolean
          id?: string
          is_active?: boolean
          max_advertisements?: number | null
          max_ai_designs?: number | null
          max_featured?: number
          max_products?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          sort_order?: number
          storage_limit_mb?: number | null
          tagline?: string | null
        }
        Relationships: []
      }
      token_packages: {
        Row: {
          bonus_tokens: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          slug: string
          sort_order: number
          tokens: number
        }
        Insert: {
          bonus_tokens?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          slug: string
          sort_order?: number
          tokens: number
        }
        Update: {
          bonus_tokens?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          slug?: string
          sort_order?: number
          tokens?: number
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_usage_logs: {
        Row: {
          amount: number
          created_at: string
          design_id: string | null
          id: string
          token_type: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          design_id?: string | null
          id?: string
          token_type: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          design_id?: string | null
          id?: string
          token_type?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_logs_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "token_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          lifetime_earned?: number
          lifetime_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          item_id: string
          item_type: Database["public"]["Enums"]["wishlist_item_type"]
          metadata: Json | null
          price: number | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_id: string
          item_type: Database["public"]["Enums"]["wishlist_item_type"]
          metadata?: Json | null
          price?: number | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          item_id?: string
          item_type?: Database["public"]["Enums"]["wishlist_item_type"]
          metadata?: Json | null
          price?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      product_analytics_mv: {
        Row: {
          ai_recommendations: number | null
          clicks: number | null
          created_at: string | null
          favorites: number | null
          is_featured: boolean | null
          product_id: string | null
          product_name: string | null
          store_id: string | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_analytics_view: {
        Row: {
          ai_recommendations: number | null
          clicks: number | null
          favorites: number | null
          is_featured: boolean | null
          product_id: string | null
          product_name: string | null
          store_id: string | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "seller_store_overview"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          address: string | null
          brand_name: string | null
          city: string | null
          contact_name: string | null
          contact_published: boolean | null
          contact_published_at: string | null
          description: string | null
          id: string | null
          phone: string | null
          rating: number | null
          website: string | null
        }
        Insert: {
          address?: never
          brand_name?: string | null
          city?: string | null
          contact_name?: never
          contact_published?: boolean | null
          contact_published_at?: string | null
          description?: string | null
          id?: string | null
          phone?: never
          rating?: number | null
          website?: never
        }
        Update: {
          address?: never
          brand_name?: string | null
          city?: string | null
          contact_name?: never
          contact_published?: boolean | null
          contact_published_at?: string | null
          description?: string | null
          id?: string | null
          phone?: never
          rating?: number | null
          website?: never
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_second_hand_listings: {
        Row: {
          bumped_at: string | null
          category: string | null
          city: string | null
          created_at: string | null
          description: string | null
          featured_until: string | null
          id: string | null
          image_url: string | null
          is_featured: boolean | null
          is_urgent: boolean | null
          phone: string | null
          price: number | null
          title: string | null
          urgent_until: string | null
          user_id: string | null
        }
        Insert: {
          bumped_at?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          featured_until?: string | null
          id?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          is_urgent?: boolean | null
          phone?: string | null
          price?: number | null
          title?: string | null
          urgent_until?: string | null
          user_id?: string | null
        }
        Update: {
          bumped_at?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          featured_until?: string | null
          id?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          is_urgent?: boolean | null
          phone?: string | null
          price?: number | null
          title?: string | null
          urgent_until?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seller_store_overview: {
        Row: {
          active_product_count: number | null
          featured_count: number | null
          name: string | null
          out_of_stock_count: number | null
          owner_id: string | null
          product_count: number | null
          rating: number | null
          store_id: string | null
          total_stock: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_profile_completion: {
        Args: { p_user_id: string }
        Returns: number
      }
      calculate_trust_score: {
        Args: { p_store_id: string }
        Returns: {
          activity_score: number
          ai_recommendation_score: number
          badges: string[]
          calculated_at: string
          has_active_subscription: boolean
          has_verified_info: boolean
          id: string
          overall_score: number
          product_completeness: number
          product_quality_score: number
          profile_completed: boolean
          store_age_days: number
          store_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "store_trust_scores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_and_award_user_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_plan_limit:
        | { Args: { p_limit_type: string; p_store_id: string }; Returns: Json }
        | {
            Args: {
              p_limit_type: string
              p_quantity?: number
              p_store_id: string
            }
            Returns: Json
          }
      consume_design_credit: { Args: { p_user_id: string }; Returns: Json }
      create_notification: {
        Args: {
          _body?: string
          _link?: string
          _metadata?: Json
          _title: string
          _type: Database["public"]["Enums"]["notification_type"]
          _user_id: string
        }
        Returns: string
      }
      credit_tokens: {
        Args: { p_amount: number; p_reason?: string; p_user_id: string }
        Returns: Json
      }
      ensure_wallet: {
        Args: { p_user_id: string }
        Returns: {
          balance: number
          created_at: string
          id: string
          lifetime_earned: number
          lifetime_spent: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_admin_daily_views: {
        Args: { p_days?: number }
        Returns: {
          day: string
          views: number
        }[]
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_store_analytics: { Args: { p_store_id: string }; Returns: Json }
      get_store_daily_views: {
        Args: { p_days?: number; p_store_id: string }
        Returns: {
          day: string
          views: number
        }[]
      }
      get_store_product_analytics: {
        Args: { p_store_id: string }
        Returns: {
          ai_recommendations: number
          clicks: number
          product_id: string
          product_name: string
          saves: number
          views: number
        }[]
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      run_store_health_check: {
        Args: { p_store_id: string }
        Returns: {
          checked_at: string
          id: string
          low_ai_recommendation: boolean
          low_ctr: boolean
          missing_colors: boolean
          missing_dimensions: boolean
          missing_material: boolean
          outdated_prices: boolean
          overall_score: number
          poor_quality_images: boolean
          products_no_category: boolean
          store_id: string
          suggestions: Json
        }
        SetofOptions: {
          from: "*"
          to: "store_health_checks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "rejected"
        | "cancelled"
      consultation_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      consultation_type: "advice" | "chat" | "custom_design"
      inspiration_room_type:
        | "living"
        | "bedroom"
        | "kitchen"
        | "bathroom"
        | "office"
        | "dining"
        | "outdoor"
      inspiration_style:
        | "modern"
        | "classic"
        | "minimal"
        | "luxury"
        | "traditional"
        | "industrial"
        | "scandinavian"
        | "bohemian"
      installer_specialty:
        | "curtain"
        | "chandelier"
        | "cabinet"
        | "wallpaper"
        | "flooring"
        | "painting"
        | "other"
      notification_type:
        | "order_new"
        | "order_status"
        | "review_new"
        | "quote_new"
        | "consultation_new"
        | "consultation_message"
        | "site_visit_new"
        | "inquiry_new"
        | "system"
        | "design_shared"
        | "featured_product_viewed"
        | "notifications_read"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
      quote_request_type: "product" | "set" | "custom"
      quote_status: "pending" | "answered" | "accepted" | "rejected" | "expired"
      review_target: "product" | "shop"
      visit_purpose:
        | "renovation"
        | "interior_design"
        | "bulk_purchase"
        | "other"
      visit_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "completed"
        | "cancelled"
      wishlist_item_type: "product" | "set" | "ai_design"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "rejected",
        "cancelled",
      ],
      consultation_status: [
        "pending",
        "assigned",
        "in_progress",
        "completed",
        "cancelled",
      ],
      consultation_type: ["advice", "chat", "custom_design"],
      inspiration_room_type: [
        "living",
        "bedroom",
        "kitchen",
        "bathroom",
        "office",
        "dining",
        "outdoor",
      ],
      inspiration_style: [
        "modern",
        "classic",
        "minimal",
        "luxury",
        "traditional",
        "industrial",
        "scandinavian",
        "bohemian",
      ],
      installer_specialty: [
        "curtain",
        "chandelier",
        "cabinet",
        "wallpaper",
        "flooring",
        "painting",
        "other",
      ],
      notification_type: [
        "order_new",
        "order_status",
        "review_new",
        "quote_new",
        "consultation_new",
        "consultation_message",
        "site_visit_new",
        "inquiry_new",
        "system",
        "design_shared",
        "featured_product_viewed",
        "notifications_read",
      ],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      quote_request_type: ["product", "set", "custom"],
      quote_status: ["pending", "answered", "accepted", "rejected", "expired"],
      review_target: ["product", "shop"],
      visit_purpose: [
        "renovation",
        "interior_design",
        "bulk_purchase",
        "other",
      ],
      visit_status: [
        "pending",
        "confirmed",
        "rejected",
        "completed",
        "cancelled",
      ],
      wishlist_item_type: ["product", "set", "ai_design"],
    },
  },
} as const
