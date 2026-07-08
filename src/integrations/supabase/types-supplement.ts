import type { Database as GenDatabase } from "./types";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface SupplementalTables {
  design_sessions: {
    Row: {
      id: string; user_id: string; created_at: string; updated_at: string;
      status: string | null; image_url: string | null; objects_data: Json | null;
      selections_data: Json | null; room_type: string | null; overall_style: string | null;
      total_price: number | null; products_data: Json | null; ai_analysis: Json | null;
      ai_processed: boolean | null; ai_processed_at: string | null; session_id: string | null;
      metadata: Json | null;
    };
    Insert: {
      id?: string; user_id: string; created_at?: string; updated_at?: string;
      status?: string | null; image_url?: string | null; objects_data?: Json | null;
      selections_data?: Json | null; room_type?: string | null; overall_style?: string | null;
      total_price?: number | null; products_data?: Json | null; ai_analysis?: Json | null;
      ai_processed?: boolean | null; ai_processed_at?: string | null; session_id?: string | null;
      metadata?: Json | null;
    };
    Update: {
      id?: string; user_id?: string; created_at?: string; updated_at?: string;
      status?: string | null; image_url?: string | null; objects_data?: Json | null;
      selections_data?: Json | null; room_type?: string | null; overall_style?: string | null;
      total_price?: number | null; products_data?: Json | null; ai_analysis?: Json | null;
      ai_processed?: boolean | null; ai_processed_at?: string | null; session_id?: string | null;
      metadata?: Json | null;
    };
  };
  reference_images: {
    Row: {
      id: string; user_id: string; image_url: string; created_at: string;
      original_name: string | null; file_size: number | null; mime_type: string | null;
      source: string | null; ai_analysis: Json | null; ai_processed: boolean | null;
      ai_processed_at: string | null;
    };
    Insert: {
      id?: string; user_id: string; image_url: string; created_at?: string;
      original_name?: string | null; file_size?: number | null; mime_type?: string | null;
      source?: string | null; ai_analysis?: Json | null; ai_processed?: boolean | null;
      ai_processed_at?: string | null;
    };
    Update: {
      id?: string; user_id?: string; image_url?: string; created_at?: string;
      original_name?: string | null; file_size?: number | null; mime_type?: string | null;
      source?: string | null; ai_analysis?: Json | null; ai_processed?: boolean | null;
      ai_processed_at?: string | null;
    };
  };
  visual_matches: {
    Row: {
      id: string; reference_image_id: string; product_id: string; user_id: string;
      confidence: number | null; match_reason: string | null; match_type: string | null;
      rank: number | null; created_at: string;
    };
    Insert: {
      id?: string; reference_image_id: string; product_id: string; user_id: string;
      confidence?: number | null; match_reason?: string | null; match_type?: string | null;
      rank?: number | null; created_at?: string;
    };
    Update: {
      id?: string; reference_image_id?: string; product_id?: string; user_id?: string;
      confidence?: number | null; match_reason?: string | null; match_type?: string | null;
      rank?: number | null; created_at?: string;
    };
  };
  saved_inspirations: {
    Row: { id: string; user_id: string; title: string | null; created_at: string; updated_at: string; selections_data: Json | null; total_price: number | null; image_base64: string | null; };
    Insert: { id?: string; user_id: string; title?: string | null; created_at?: string; updated_at?: string; selections_data?: Json | null; total_price?: number | null; image_base64?: string | null; };
    Update: { id?: string; user_id?: string; title?: string | null; created_at?: string; updated_at?: string; selections_data?: Json | null; total_price?: number | null; image_base64?: string | null; };
  };
  saved_inspiration_products: {
    Row: { id: string; saved_inspiration_id: string; product_id: string; object_label: string | null; created_at: string; };
    Insert: { id?: string; saved_inspiration_id: string; product_id: string; object_label?: string | null; created_at?: string; };
    Update: { id?: string; saved_inspiration_id?: string; product_id?: string; object_label?: string | null; created_at?: string; };
  };
  audit_logs: {
    Row: { id: string; user_id: string; event_type: string; entity_type: string | null; entity_id: string | null; metadata: Json | null; created_at: string; };
    Insert: { id?: string; user_id: string; event_type: string; entity_type?: string | null; entity_id?: string | null; metadata?: Json | null; created_at?: string; };
    Update: { id?: string; user_id?: string; event_type?: string; entity_type?: string | null; entity_id?: string | null; metadata?: Json | null; created_at?: string; };
  };
  payments: {
    Row: { id: string; order_id: string; amount: number; status: string; payment_method: string | null; transaction_id: string | null; created_at: string; };
    Insert: { id?: string; order_id: string; amount: number; status?: string; payment_method?: string | null; transaction_id?: string | null; created_at?: string; };
    Update: { id?: string; order_id?: string; amount?: number; status?: string; payment_method?: string | null; transaction_id?: string | null; created_at?: string; };
  };
  wallet_transactions: {
    Row: { id: string; wallet_id: string; amount: number; type: string; description: string | null; reference_id: string | null; created_at: string; };
    Insert: { id?: string; wallet_id: string; amount: number; type: string; description?: string | null; reference_id?: string | null; created_at?: string; };
    Update: { id?: string; wallet_id?: string; amount?: number; type?: string; description?: string | null; reference_id?: string | null; created_at?: string; };
  };
  reports: {
    Row: { id: string; reporter_id: string; target_type: string; target_id: string; reason: string; description: string | null; status: string; created_at: string; };
    Insert: { id?: string; reporter_id: string; target_type: string; target_id: string; reason: string; description?: string | null; status?: string; created_at?: string; };
    Update: { id?: string; reporter_id?: string; target_type?: string; target_id?: string; reason?: string; description?: string | null; status?: string; created_at?: string; };
  };
  product_daily_views: {
    Row: { id: string; product_id: string; date: string; views: number; };
    Insert: { id?: string; product_id: string; date: string; views?: number; };
    Update: { id?: string; product_id?: string; date?: string; views?: number; };
  };
  listing_promotions: {
    Row: { id: string; listing_id: string; plan_id: string; start_date: string; end_date: string; status: string; created_at: string; };
    Insert: { id?: string; listing_id: string; plan_id: string; start_date: string; end_date: string; status?: string; created_at?: string; };
    Update: { id?: string; listing_id?: string; plan_id?: string; start_date?: string; end_date?: string; status?: string; created_at?: string; };
  };
  inquiries: {
    Row: { id: string; customer_id: string; profile_id: string; product_id: string | null; message: string; status: string; created_at: string; };
    Insert: { id?: string; customer_id: string; profile_id: string; product_id?: string | null; message: string; status?: string; created_at?: string; };
    Update: { id?: string; customer_id?: string; profile_id?: string; product_id?: string | null; message?: string; status?: string; created_at?: string; };
  };
  advertisements: {
    Row: { id: string; title: string; description: string | null; image_url: string | null; link_url: string | null; placement: string; status: string; start_date: string; end_date: string; created_at: string; };
    Insert: { id?: string; title: string; description?: string | null; image_url?: string | null; link_url?: string | null; placement: string; status?: string; start_date: string; end_date: string; created_at?: string; };
    Update: { id?: string; title?: string; description?: string | null; image_url?: string | null; link_url?: string | null; placement?: string; status?: string; start_date?: string; end_date?: string; created_at?: string; };
  };
  ai_analysis_cache: {
    Row: { id: string; user_id: string; file_hash: string; analysis_type: string; result: Json; created_at: string; expires_at: string; };
    Insert: { id?: string; user_id: string; file_hash: string; analysis_type: string; result: Json; created_at?: string; expires_at?: string; };
    Update: { id?: string; user_id?: string; file_hash?: string; analysis_type?: string; result?: Json; created_at?: string; expires_at?: string; };
  };
}
