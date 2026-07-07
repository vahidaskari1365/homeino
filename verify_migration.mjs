const token = 'sbp_6d9d1da0b03a3effc48ec999991d96834bed1363';

const queries = [
  // Check tables exist
  `SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('notification_preferences', 'notification_logs')`,
  // Check columns in subscription_plans
  `SELECT column_name FROM information_schema.columns 
   WHERE table_schema = 'public' AND table_name = 'subscription_plans' 
   AND column_name IN ('max_ai_designs', 'max_advertisements', 'storage_limit_mb', 'has_analytics')`,
  // Check functions exist
  `SELECT proname FROM pg_proc WHERE proname IN (
    'check_plan_limit', 'get_store_analytics', 
    'calculate_profile_completion', 'get_admin_dashboard_stats'
  ) AND pronamespace = 'public'::regnamespace`,
  // Check indexes exist
  `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' 
   AND indexname IN ('idx_notifications_store_id', 'idx_products_store_active', 
   'idx_products_created_at', 'idx_stores_owner_id', 'idx_designs_room_id',
   'idx_placements_design_product', 'idx_wishlists_user_type', 
   'idx_orders_profile', 'idx_product_views_product', 'idx_notifications_user_read')`,
  // Check RLS is enabled
  `SELECT relname FROM pg_class WHERE relname IN ('notification_preferences', 'notification_logs') 
   AND relrowsecurity = true`,
];

for (let i = 0; i < queries.length; i++) {
  const response = await fetch(
    'https://api.supabase.com/v1/projects/tljdihejjoepkcgftian/database/query',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queries[i] }),
    }
  );
  const data = await response.json();
  console.log(`Query ${i + 1}: ${JSON.stringify(data)}`);
}
