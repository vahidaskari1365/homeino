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
          room_type?: Database["public"]["Enums"]["inspiration_room_type"] | null
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
          room_type?: Database["public"]["Enums"]["inspiration_room_type"] | null
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
          }
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
          }
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
          product_id: string | null
          profile_id: string
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
          product_id?: string | null
          profile_id: string
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
          product_id?: string | null
          profile_id?: string
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
          attributes: Json
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          profile_id: string
          rating: number
          stock: number
          updated_at: string
        }
        Insert: {
          attributes?: Json
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          profile_id: string
          rating?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          attributes?: Json
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          profile_id?: string
          rating?: number
          stock?: number
          updated_at?: string
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
            foreignKeyName: "products_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
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
          address: string | null
          approval_status: string
          brand_name: string
          city: string | null
          contact_name: string | null
          contact_published: boolean
          contact_published_at: string | null
          created_at: string
          description: string | null
          id: string
          is_blocked: boolean
          is_visible: boolean
          phone: string | null
          rejection_reason: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          approval_status?: string
          brand_name: string
          city?: string | null
          contact_name?: string | null
          contact_published?: boolean
          contact_published_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean
          is_visible?: boolean
          phone?: string | null
          rejection_reason?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          approval_status?: string
          brand_name?: string
          city?: string | null
          contact_name?: string | null
          contact_published?: boolean
          contact_published_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean
          is_visible?: boolean
          phone?: string | null
          rejection_reason?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
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
    }
    Views: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
