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
  public: {
    Tables: {
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
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      analytics_events: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean
          max_featured: number
          max_products: number | null
          name: string
          price_monthly: number
          price_yearly: number
          slug: string
          sort_order: number
          tagline: string | null
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_featured?: number
          max_products?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          slug: string
          sort_order?: number
          tagline?: string | null
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_featured?: number
          max_products?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
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
      advertisements: {
        Row: {
          click_count: number
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          placement: string
          start_date: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          click_count?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          start_date?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          click_count?: number
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          placement?: string
          start_date?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
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
      inquiries: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string
          product_id: string | null
          profile_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone: string
          product_id?: string | null
          profile_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string
          product_id?: string | null
          profile_id?: string
        }
        Relationships: []
      }
      listing_promotions: {
        Row: {
          amount: number
          created_at: string
          duration_days: number
          expires_at: string | null
          id: string
          listing_id: string
          promotion_type: Database["public"]["Enums"]["promotion_type"]
          starts_at: string
          status: Database["public"]["Enums"]["promotion_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          listing_id: string
          promotion_type: Database["public"]["Enums"]["promotion_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["promotion_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          listing_id?: string
          promotion_type?: Database["public"]["Enums"]["promotion_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["promotion_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_promotions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_second_hand_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_promotions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "second_hand_listings"
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
          metadata: Json
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
          metadata?: Json
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
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
      payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          id: string
          method: string
          order_id: string
          paid_at: string | null
          profile_id: string
          reference_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id: string
          id?: string
          method?: string
          order_id: string
          paid_at?: string | null
          profile_id: string
          reference_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          id?: string
          method?: string
          order_id?: string
          paid_at?: string | null
          profile_id?: string
          reference_code?: string | null
          status?: string
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
        ]
      }
      price_quotes: {
        Row: {
          answered_at: string | null
          budget_max: number | null
          budget_min: number | null
          city: string | null
          created_at: string
          customer_id: string
          customer_name: string
          customer_phone: string
          description: string | null
          id: string
          items: Json
          notes: string | null
          product_id: string | null
          product_name: string | null
          profile_id: string
          proposed_price: number | null
          quantity: number | null
          quoted_price: number | null
          request_type: Database["public"]["Enums"]["quote_request_type"]
          seller_note: string | null
          set_id: string | null
          status: Database["public"]["Enums"]["quote_status"]
          title: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          answered_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string
          customer_id: string
          customer_name: string
          customer_phone: string
          description?: string | null
          id?: string
          items?: Json
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          profile_id: string
          proposed_price?: number | null
          quantity?: number | null
          quoted_price?: number | null
          request_type?: Database["public"]["Enums"]["quote_request_type"]
          seller_note?: string | null
          set_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          title: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          answered_at?: string | null
          budget_max?: number | null
          budget_min?: number | null
          city?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          description?: string | null
          id?: string
          items?: Json
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          profile_id?: string
          proposed_price?: number | null
          quantity?: number | null
          quoted_price?: number | null
          request_type?: Database["public"]["Enums"]["quote_request_type"]
          seller_note?: string | null
          set_id?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          title?: string
          updated_at?: string
          valid_until?: string | null
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
          profile_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          profile_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          profile_id?: string
          viewer_id?: string | null
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
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_categories: {
        Row: {
          category_id: string
          created_at: string
          profile_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          profile_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "producer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_categories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_categories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
      reports: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
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
      second_hand_listings: {
        Row: {
          approval_status: string
          bumped_at: string | null
          city: string | null
          created_at: string
          description: string | null
          featured_until: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_urgent: boolean
          phone: string | null
          price: number | null
          rejection_reason: string | null
          title: string
          updated_at: string
          urgent_until: string | null
          user_id: string
        }
        Insert: {
          approval_status?: string
          bumped_at?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_urgent?: boolean
          phone?: string | null
          price?: number | null
          rejection_reason?: string | null
          title: string
          updated_at?: string
          urgent_until?: string | null
          user_id: string
        }
        Update: {
          approval_status?: string
          bumped_at?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_urgent?: boolean
          phone?: string | null
          price?: number | null
          rejection_reason?: string | null
          title?: string
          updated_at?: string
          urgent_until?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          address: string | null
          city: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string
          customer_name: string
          customer_phone: string
          description: string | null
          id: string
          preferred_date: string | null
          preferred_time_range: string | null
          profile_id: string
          purpose: Database["public"]["Enums"]["visit_purpose"]
          seller_note: string | null
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id: string
          customer_name: string
          customer_phone: string
          description?: string | null
          id?: string
          preferred_date?: string | null
          preferred_time_range?: string | null
          profile_id: string
          purpose?: Database["public"]["Enums"]["visit_purpose"]
          seller_note?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          description?: string | null
          id?: string
          preferred_date?: string | null
          preferred_time_range?: string | null
          profile_id?: string
          purpose?: Database["public"]["Enums"]["visit_purpose"]
          seller_note?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
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
      wallets: {
        Row: {
          id: string
          user_id: string
          balance: number
          lifetime_earned: number
          lifetime_spent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          lifetime_earned?: number
          lifetime_spent?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "wallets_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      token_packages: {
        Row: {
          id: string; name: string; slug: string; tokens: number; price: number
          bonus_tokens: number; is_active: boolean; sort_order: number; created_at: string
        }
        Insert: {
          id?: string; name: string; slug: string; tokens: number; price: number
          bonus_tokens?: number; is_active?: boolean; sort_order?: number; created_at?: string
        }
        Update: {
          id?: string; name?: string; slug?: string; tokens?: number; price?: number
          bonus_tokens?: number; is_active?: boolean; sort_order?: number; created_at?: string
        }
        Relationships: []
      }
      token_usage_logs: {
        Row: {
          id: string; user_id: string; design_id: string | null; transaction_id: string | null
          token_type: string; amount: number; created_at: string
        }
        Insert: {
          id?: string; user_id: string; design_id?: string | null; transaction_id?: string | null
          token_type: string; amount?: number; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; design_id?: string | null; transaction_id?: string | null
          token_type?: string; amount?: number; created_at?: string
        }
        Relationships: [
          { foreignKeyName: "token_usage_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "token_usage_logs_design_id_fkey"; columns: ["design_id"]; isOneToOne: false; referencedRelation: "designs"; referencedColumns: ["id"] },
        ]
      }
      store_daily_stats: {
        Row: {
          id: string; store_id: string; date: string; views: number; unique_visitors: number
          clicks: number; favorites: number; ai_recommendations: number; orders_count: number; revenue: number; created_at: string
        }
        Insert: {
          id?: string; store_id: string; date: string; views?: number; unique_visitors?: number
          clicks?: number; favorites?: number; ai_recommendations?: number; orders_count?: number; revenue?: number; created_at?: string
        }
        Update: {
          id?: string; store_id?: string; date?: string; views?: number; unique_visitors?: number
          clicks?: number; favorites?: number; ai_recommendations?: number; orders_count?: number; revenue?: number; created_at?: string
        }
        Relationships: [{ foreignKeyName: "store_daily_stats_store_id_fkey"; columns: ["store_id"]; isOneToOne: false; referencedRelation: "stores"; referencedColumns: ["id"] }]
      }
      store_health_checks: {
        Row: {
          id: string; store_id: string; overall_score: number; missing_dimensions: boolean
          poor_quality_images: boolean; missing_material: boolean; missing_colors: boolean
          low_ai_recommendation: boolean; low_ctr: boolean; outdated_prices: boolean
          products_no_category: boolean; suggestions: Json; checked_at: string
        }
        Insert: {
          id?: string; store_id: string; overall_score?: number; missing_dimensions?: boolean
          poor_quality_images?: boolean; missing_material?: boolean; missing_colors?: boolean
          low_ai_recommendation?: boolean; low_ctr?: boolean; outdated_prices?: boolean
          products_no_category?: boolean; suggestions?: Json; checked_at?: string
        }
        Update: {
          id?: string; store_id?: string; overall_score?: number; missing_dimensions?: boolean
          poor_quality_images?: boolean; missing_material?: boolean; missing_colors?: boolean
          low_ai_recommendation?: boolean; low_ctr?: boolean; outdated_prices?: boolean
          products_no_category?: boolean; suggestions?: Json; checked_at?: string
        }
        Relationships: [{ foreignKeyName: "store_health_checks_store_id_fkey"; columns: ["store_id"]; isOneToOne: false; referencedRelation: "stores"; referencedColumns: ["id"] }]
      }
      store_trust_scores: {
        Row: {
          id: string; store_id: string; overall_score: number; profile_completed: boolean
          has_verified_info: boolean; product_quality_score: number; product_completeness: number
          has_active_subscription: boolean; activity_score: number; ai_recommendation_score: number
          store_age_days: number; badges: string[]; calculated_at: string; updated_at: string
        }
        Insert: {
          id?: string; store_id: string; overall_score?: number; profile_completed?: boolean
          has_verified_info?: boolean; product_quality_score?: number; product_completeness?: number
          has_active_subscription?: boolean; activity_score?: number; ai_recommendation_score?: number
          store_age_days?: number; badges?: string[]; calculated_at?: string; updated_at?: string
        }
        Update: {
          id?: string; store_id?: string; overall_score?: number; profile_completed?: boolean
          has_verified_info?: boolean; product_quality_score?: number; product_completeness?: number
          has_active_subscription?: boolean; activity_score?: number; ai_recommendation_score?: number
          store_age_days?: number; badges?: string[]; calculated_at?: string; updated_at?: string
        }
        Relationships: [{ foreignKeyName: "store_trust_scores_store_id_fkey"; columns: ["store_id"]; isOneToOne: true; referencedRelation: "stores"; referencedColumns: ["id"] }]
      }
      badge_definitions: {
        Row: {
          id: string; name: string; slug: string; description: string | null
          category: string; icon: string | null; criteria: Json; is_active: boolean; sort_order: number; created_at: string
        }
        Insert: {
          id?: string; name: string; slug: string; description?: string | null
          category: string; icon?: string | null; criteria?: Json; is_active?: boolean; sort_order?: number; created_at?: string
        }
        Update: {
          id?: string; name?: string; slug?: string; description?: string | null
          category?: string; icon?: string | null; criteria?: Json; is_active?: boolean; sort_order?: number; created_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: { id: string; user_id: string; badge_id: string; awarded_at: string }
        Insert: { id?: string; user_id: string; badge_id: string; awarded_at?: string }
        Update: { id?: string; user_id?: string; badge_id?: string; awarded_at?: string }
        Relationships: [
          { foreignKeyName: "user_badges_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "user_badges_badge_id_fkey"; columns: ["badge_id"]; isOneToOne: false; referencedRelation: "badge_definitions"; referencedColumns: ["id"] },
        ]
      }
      seller_badges: {
        Row: { id: string; store_id: string; badge_id: string; awarded_at: string }
        Insert: { id?: string; store_id: string; badge_id: string; awarded_at?: string }
        Update: { id?: string; store_id?: string; badge_id?: string; awarded_at?: string }
        Relationships: [
          { foreignKeyName: "seller_badges_store_id_fkey"; columns: ["store_id"]; isOneToOne: false; referencedRelation: "stores"; referencedColumns: ["id"] },
          { foreignKeyName: "seller_badges_badge_id_fkey"; columns: ["badge_id"]; isOneToOne: false; referencedRelation: "badge_definitions"; referencedColumns: ["id"] },
        ]
      }
      notification_preferences: {
        Row: {
          id: string; user_id: string; in_app: boolean; email: boolean; sms: boolean; push: boolean
          order_updates: boolean; design_updates: boolean; marketing: boolean; system_alerts: boolean
          created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; in_app?: boolean; email?: boolean; sms?: boolean; push?: boolean
          order_updates?: boolean; design_updates?: boolean; marketing?: boolean; system_alerts?: boolean
          created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string; in_app?: boolean; email?: boolean; sms?: boolean; push?: boolean
          order_updates?: boolean; design_updates?: boolean; marketing?: boolean; system_alerts?: boolean
          created_at?: string; updated_at?: string
        }
        Relationships: [{ foreignKeyName: "notification_preferences_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      notification_logs: {
        Row: {
          id: string; notification_id: string | null; user_id: string; channel: string
          status: string; error_message: string | null; delivered_at: string | null; read_at: string | null; created_at: string
        }
        Insert: {
          id?: string; notification_id?: string | null; user_id: string; channel: string
          status?: string; error_message?: string | null; delivered_at?: string | null; read_at?: string | null; created_at?: string
        }
        Update: {
          id?: string; notification_id?: string | null; user_id?: string; channel?: string
          status?: string; error_message?: string | null; delivered_at?: string | null; read_at?: string | null; created_at?: string
        }
        Relationships: [
          { foreignKeyName: "notification_logs_notification_id_fkey"; columns: ["notification_id"]; isOneToOne: false; referencedRelation: "notifications"; referencedColumns: ["id"] },
          { foreignKeyName: "notification_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      admin_audit_logs: {
        Row: {
          id: string; admin_id: string; action: string; entity_type: string | null
          entity_id: string | null; details: Json; ip_address: string | null; created_at: string
        }
        Insert: {
          id?: string; admin_id: string; action: string; entity_type?: string | null
          entity_id?: string | null; details?: Json; ip_address?: string | null; created_at?: string
        }
        Update: {
          id?: string; admin_id?: string; action?: string; entity_type?: string | null
          entity_id?: string | null; details?: Json; ip_address?: string | null; created_at?: string
        }
        Relationships: [{ foreignKeyName: "admin_audit_logs_admin_id_fkey"; columns: ["admin_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      audit_logs: {
        Row: {
          id: string; actor_id: string; actor_type: string; target_type: string | null
          target_id: string | null; action: string | null; old_values: Json; new_values: Json
          ip_address: string | null; created_at: string
        }
        Insert: {
          id?: string; actor_id: string; actor_type: string; target_type?: string | null
          target_id?: string | null; action?: string | null; old_values?: Json; new_values?: Json
          ip_address?: string | null; created_at?: string
        }
        Update: {
          id?: string; actor_id?: string; actor_type?: string; target_type?: string | null
          target_id?: string | null; action?: string | null; old_values?: Json; new_values?: Json
          ip_address?: string | null; created_at?: string
        }
        Relationships: [{ foreignKeyName: "audit_logs_actor_id_fkey"; columns: ["actor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      wallet_transactions: {
        Row: {
          id: string; wallet_id: string; user_id: string; credit: number; debit: number
          balance_after: number; reason: string; reference_type: string | null
          reference_id: string | null; description: string | null; created_at: string
        }
        Insert: {
          id?: string; wallet_id: string; user_id: string; credit?: number; debit?: number
          balance_after: number; reason: string; reference_type?: string | null
          reference_id?: string | null; description?: string | null; created_at?: string
        }
        Update: {
          id?: string; wallet_id?: string; user_id?: string; credit?: number; debit?: number
          balance_after?: number; reason?: string; reference_type?: string | null
          reference_id?: string | null; description?: string | null; created_at?: string
        }
        Relationships: [
          { foreignKeyName: "wallet_transactions_wallet_id_fkey"; columns: ["wallet_id"]; isOneToOne: false; referencedRelation: "wallets"; referencedColumns: ["id"] },
          { foreignKeyName: "wallet_transactions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      reference_images: {
        Row: {
          id: string; user_id: string; image_url: string; detected_objects: Json
          style_analysis: Json | null; color_palette: string[] | null; status: string; created_at: string
        }
        Insert: {
          id?: string; user_id: string; image_url: string; detected_objects?: Json
          style_analysis?: Json | null; color_palette?: string[] | null; status?: string; created_at?: string
        }
        Update: {
          id?: string; user_id?: string; image_url?: string; detected_objects?: Json
          style_analysis?: Json | null; color_palette?: string[] | null; status?: string; created_at?: string
        }
        Relationships: [{ foreignKeyName: "reference_images_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      visual_matches: {
        Row: {
          id: string; reference_image_id: string; product_id: string; score: number
          match_type: string; metadata: Json; created_at: string
        }
        Insert: {
          id?: string; reference_image_id: string; product_id: string; score: number
          match_type: string; metadata?: Json; created_at?: string
        }
        Update: {
          id?: string; reference_image_id?: string; product_id?: string; score?: number
          match_type?: string; metadata?: Json; created_at?: string
        }
        Relationships: [
          { foreignKeyName: "visual_matches_reference_image_id_fkey"; columns: ["reference_image_id"]; isOneToOne: false; referencedRelation: "reference_images"; referencedColumns: ["id"] },
          { foreignKeyName: "visual_matches_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ]
      }
      saved_inspirations: {
        Row: {
          id: string; user_id: string; title: string; description: string | null
          source_image_url: string | null; style: string | null; room_type: string | null
          metadata: Json; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; title?: string; description?: string | null
          source_image_url?: string | null; style?: string | null; room_type?: string | null
          metadata?: Json; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string; title?: string; description?: string | null
          source_image_url?: string | null; style?: string | null; room_type?: string | null
          metadata?: Json; created_at?: string; updated_at?: string
        }
        Relationships: [{ foreignKeyName: "saved_inspirations_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      saved_inspiration_products: {
        Row: {
          id: string; saved_inspiration_id: string; product_id: string; note: string | null; created_at: string
        }
        Insert: {
          id?: string; saved_inspiration_id: string; product_id: string; note?: string | null; created_at?: string
        }
        Update: {
          id?: string; saved_inspiration_id?: string; product_id?: string; note?: string | null; created_at?: string
        }
        Relationships: [
          { foreignKeyName: "saved_inspiration_products_saved_inspiration_id_fkey"; columns: ["saved_inspiration_id"]; isOneToOne: false; referencedRelation: "saved_inspirations"; referencedColumns: ["id"] },
          { foreignKeyName: "saved_inspiration_products_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        ]
      }
      design_sessions: {
        Row: {
          id: string; user_id: string; inspiration_id: string | null; title: string
          source_image_url: string | null; design_metadata: Json; status: string; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; user_id: string; inspiration_id?: string | null; title?: string
          source_image_url?: string | null; design_metadata?: Json; status?: string; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; user_id?: string; inspiration_id?: string | null; title?: string
          source_image_url?: string | null; design_metadata?: Json; status?: string; created_at?: string; updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "design_sessions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "design_sessions_inspiration_id_fkey"; columns: ["inspiration_id"]; isOneToOne: false; referencedRelation: "inspirations"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: {
      product_analytics_view: {
        Row: {
          product_id: string | null; store_id: string | null; product_name: string | null
          views: number | null; clicks: number | null; favorites: number | null
          ai_recommendations: number | null; is_featured: boolean | null
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
        Relationships: []
      }
      product_daily_views: {
        Row: {
          day: string | null
          product_id: string | null
          profile_id: string | null
          views: number | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          address: string | null
          approval_status: string | null
          brand_name: string | null
          city: string | null
          contact_name: string | null
          contact_published: boolean | null
          contact_published_at: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_blocked: boolean | null
          is_visible: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
        }
        Insert: {
          address?: never
          approval_status?: string | null
          brand_name?: string | null
          city?: string | null
          contact_name?: never
          contact_published?: boolean | null
          contact_published_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_blocked?: boolean | null
          is_visible?: boolean | null
          phone?: never
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Update: {
          address?: never
          approval_status?: string | null
          brand_name?: string | null
          city?: string | null
          contact_name?: never
          contact_published?: boolean | null
          contact_published_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_blocked?: boolean | null
          is_visible?: boolean | null
          phone?: never
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      public_second_hand_listings: {
        Row: {
          approval_status: string | null
          bumped_at: string | null
          city: string | null
          created_at: string | null
          description: string | null
          featured_until: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_urgent: boolean | null
          price: number | null
          title: string | null
          updated_at: string | null
          urgent_until: string | null
          user_id: string | null
        }
        Insert: {
          approval_status?: string | null
          bumped_at?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          featured_until?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_urgent?: boolean | null
          price?: number | null
          title?: string | null
          updated_at?: string | null
          urgent_until?: string | null
          user_id?: string | null
        }
        Update: {
          approval_status?: string | null
          bumped_at?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          featured_until?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_urgent?: boolean | null
          price?: number | null
          title?: string | null
          updated_at?: string | null
          urgent_until?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_advertisements: { Args: Record<string, never>; Returns: Json }
      admin_get_ai_logs: { Args: { p_limit?: number; p_offset?: number }; Returns: Json }
      admin_get_reports_summary: { Args: Record<string, never>; Returns: Json }
      admin_get_stores_detailed: { Args: Record<string, never>; Returns: Json }
      admin_get_subscriptions: { Args: Record<string, never>; Returns: Json }
      admin_get_system_health: { Args: Record<string, never>; Returns: Json }
      admin_search_audit_logs: { Args: { p_actor_id?: string; p_actor_type?: string; p_target_type?: string; p_action?: string; p_from_date?: string; p_to_date?: string; p_limit?: number; p_offset?: number }; Returns: Json }
      calculate_profile_completion: { Args: { p_user_id: string }; Returns: number }
      calculate_trust_score: { Args: { p_store_id: string }; Returns: Json }
      check_and_award_user_badges: { Args: { p_user_id?: string }; Returns: Json }
      check_plan_limit: { Args: { p_store_id: string; p_limit_type: string; p_quantity?: number }; Returns: Json }
      check_store_limit: { Args: { p_limit_type: string; p_quantity?: number; p_store_id: string }; Returns: Json }
      consume_design_credit: { Args: { p_user_id: string }; Returns: Json }
      create_audit_log: { Args: { p_actor_id: string; p_actor_type: string; p_target_type: string; p_target_id?: string; p_action?: string; p_old_values?: Json; p_new_values?: Json }; Returns: string }
      create_notification: { Args: { _body?: string; _link?: string; _metadata?: Json; _title: string; _type: Database["public"]["Enums"]["notification_type"]; _user_id: string }; Returns: string }
      credit_tokens: { Args: { p_amount: number; p_reason?: string; p_user_id: string }; Returns: Json }
      credit_wallet: { Args: { p_amount: number; p_reason?: string; p_user_id: string }; Returns: Json }
      debit_wallet: { Args: { p_amount: number; p_reason?: string; p_user_id: string }; Returns: Json }
      ensure_wallet: { Args: { p_user_id: string }; Returns: string }
      get_admin_dashboard_stats: { Args: Record<string, never>; Returns: Json }
      get_cached_object_detection: { Args: { p_image_hash: string }; Returns: Json }
      get_store_analytics: { Args: { p_store_id: string }; Returns: Json }
      get_store_analytics_ai_insights: { Args: { p_store_id: string }; Returns: Json }
      get_store_analytics_overview: { Args: { p_store_id: string }; Returns: Json }
      get_store_daily_views: { Args: { p_days?: number; p_store_id: string }; Returns: { day: string; views: number }[] }
      get_store_health_report: { Args: { p_store_id: string }; Returns: Json }
      get_store_limits: { Args: { p_store_id: string }; Returns: Json }
      get_store_product_analytics: { Args: { p_store_id: string }; Returns: { ai_recommendations: number; clicks: number; product_id: string; product_name: string; saves: number; views: number }[] }
      has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }; Returns: boolean }
      increment_store_usage: { Args: { p_limit_type: string; p_store_id: string }; Returns: void }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      run_store_health_check: { Args: { p_store_id: string }; Returns: Json }
      save_object_detection_cache: { Args: { p_image_hash: string; p_user_id: string; p_analysis: Json }; Returns: string }
      save_object_matches: { Args: { p_detection_id: string; p_matches: Json }; Returns: void }
      search_all: { Args: { p_query: string; p_limit?: number }; Returns: Json }
      search_products_for_object: { Args: { p_object_name: string; p_limit?: number; p_store_id?: string }; Returns: Json }
      search_similar_products: { Args: { p_embedding?: number[]; p_limit?: number; p_store_id?: string }; Returns: Json }
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
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
      promotion_status: "pending" | "active" | "expired" | "cancelled"
      promotion_type: "urgent" | "featured" | "bump"
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
      ],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      promotion_status: ["pending", "active", "expired", "cancelled"],
      promotion_type: ["urgent", "featured", "bump"],
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
