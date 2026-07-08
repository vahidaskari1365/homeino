-- Content Hub: extends inspirations table to become the Content Hub
-- Every item is a piece of content with a type, metadata, and relations

ALTER TABLE inspirations
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'inspiration',
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS materials TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reading_time INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS popularity INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS video_type TEXT,
  ADD COLUMN IF NOT EXISTS before_image_url TEXT,
  ADD COLUMN IF NOT EXISTS after_image_url TEXT,
  ADD COLUMN IF NOT EXISTS designer_name TEXT,
  ADD COLUMN IF NOT EXISTS completion_time TEXT,
  ADD COLUMN IF NOT EXISTS is_project_showcase BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_customer_showcase BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS content_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- Junction table for content-to-content relations
CREATE TABLE IF NOT EXISTS content_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_content_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  target_content_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_content_id, target_content_id, relation_type)
);

-- Junction table for content-to-product relations (beyond inspiration_products hotspots)
CREATE TABLE IF NOT EXISTS content_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, product_id, relation_type)
);

-- Junction table for content-to-store relations
CREATE TABLE IF NOT EXISTS content_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, store_id)
);

-- Junction table for content-to-service relations
CREATE TABLE IF NOT EXISTS content_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content views tracking
CREATE TABLE IF NOT EXISTS content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES inspirations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  referrer TEXT,
  read_time_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inspirations_content_type ON inspirations(content_type);
CREATE INDEX IF NOT EXISTS idx_inspirations_slug ON inspirations(slug);
CREATE INDEX IF NOT EXISTS idx_inspirations_is_featured ON inspirations(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_inspirations_popularity ON inspirations(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_inspirations_style_content ON inspirations(style, content_type);
CREATE INDEX IF NOT EXISTS idx_inspirations_room_content ON inspirations(room_type, content_type);
CREATE INDEX IF NOT EXISTS idx_content_relations_source ON content_relations(source_content_id);
CREATE INDEX IF NOT EXISTS idx_content_relations_target ON content_relations(target_content_id);
CREATE INDEX IF NOT EXISTS idx_content_products_content ON content_products(content_id);
CREATE INDEX IF NOT EXISTS idx_content_products_product ON content_products(product_id);
CREATE INDEX IF NOT EXISTS idx_content_stores_content ON content_stores(content_id);
CREATE INDEX IF NOT EXISTS idx_content_views_content ON content_views(content_id);

-- Update search RPC to include content_type
CREATE OR REPLACE FUNCTION search_content(p_query TEXT)
RETURNS SETOF inspirations
LANGUAGE SQL
STABLE
AS $$
  SELECT *
  FROM inspirations
  WHERE
    ai_processed = TRUE
    AND (
      title_fa ILIKE '%' || p_query || '%'
      OR title ILIKE '%' || p_query || '%'
      OR description_fa ILIKE '%' || p_query || '%'
      OR description ILIKE '%' || p_query || '%'
      OR summary ILIKE '%' || p_query || '%'
      OR p_query = ANY(tags)
      OR content_type ILIKE '%' || p_query || '%'
    )
  ORDER BY popularity DESC, created_at DESC
  LIMIT 50;
$$;

-- Helper function to get distinct values from any column
CREATE OR REPLACE FUNCTION get_distinct_values(table_name TEXT, column_name TEXT)
RETURNS SETOF TEXT
LANGUAGE PLPGSQL
STABLE
AS $$
BEGIN
  RETURN QUERY EXECUTE format('SELECT DISTINCT %I::TEXT FROM %I WHERE %I IS NOT NULL AND %I != ''''', column_name, table_name, column_name, column_name);
END;
$$;
