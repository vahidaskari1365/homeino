-- Enable pg_trgm for fuzzy search if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search_vector to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B')
) STORED;

CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN (search_vector);

-- Add search_vector to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(brand_name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B')
) STORED;

CREATE INDEX IF NOT EXISTS profiles_search_idx ON profiles USING GIN (search_vector);

-- Add search_vector to second_hand_listings
ALTER TABLE second_hand_listings ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B')
) STORED;

CREATE INDEX IF NOT EXISTS second_hand_listings_search_idx ON second_hand_listings USING GIN (search_vector);

-- Function to search across multiple tables (for SearchDialog)
CREATE OR REPLACE FUNCTION search_all(query text)
RETURNS json AS $$
DECLARE
    products_res json;
    profiles_res json;
    second_hand_res json;
BEGIN
    SELECT json_agg(t) INTO products_res FROM (
        SELECT id, name, price, image_url, profile_id
        FROM products
        WHERE search_vector @@ websearch_to_tsquery('simple', query)
        OR name ILIKE '%' || query || '%'
        LIMIT 8
    ) t;

    SELECT json_agg(t) INTO profiles_res FROM (
        SELECT id, brand_name, city
        FROM profiles
        WHERE search_vector @@ websearch_to_tsquery('simple', query)
        OR brand_name ILIKE '%' || query || '%'
        AND is_visible = true
        LIMIT 6
    ) t;

    SELECT json_agg(t) INTO second_hand_res FROM (
        SELECT id, title, price, city
        FROM second_hand_listings
        WHERE search_vector @@ websearch_to_tsquery('simple', query)
        OR title ILIKE '%' || query || '%'
        AND is_active = true
        AND approval_status = 'approved'
        LIMIT 6
    ) t;

    RETURN json_build_object(
        'products', coalesce(products_res, '[]'::json),
        'profiles', coalesce(profiles_res, '[]'::json),
        'second_hand', coalesce(second_hand_res, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
