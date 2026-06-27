-- Create ENUMs
CREATE TYPE inspiration_style AS ENUM ('modern', 'classic', 'minimal', 'luxury', 'traditional', 'industrial', 'scandinavian', 'bohemian');
CREATE TYPE inspiration_room_type AS ENUM ('living', 'bedroom', 'kitchen', 'bathroom', 'office', 'dining', 'outdoor');

-- Create inspirations table
CREATE TABLE IF NOT EXISTS inspirations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    title_fa TEXT,
    description TEXT,
    description_fa TEXT,
    image_url TEXT NOT NULL,
    source_url TEXT,
    source_name TEXT,
    source_rss_feed TEXT,
    tags TEXT[],
    style inspiration_style,
    room_type inspiration_room_type,
    color_palette JSONB,
    budget_range_min NUMERIC,
    budget_range_max NUMERIC,
    ai_processed BOOLEAN DEFAULT FALSE,
    ai_translated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0
);

-- Create user_collections table
CREATE TABLE IF NOT EXISTS user_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create collection_items table to link inspirations to collections
CREATE TABLE IF NOT EXISTS collection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES user_collections(id) ON DELETE CASCADE,
    inspiration_id UUID REFERENCES inspirations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, inspiration_id)
);

-- Create inspiration_products table for "Shop the Look"
CREATE TABLE IF NOT EXISTS inspiration_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspiration_id UUID REFERENCES inspirations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    x_position NUMERIC NOT NULL, -- percentage 0-100
    y_position NUMERIC NOT NULL, -- percentage 0-100
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create inspiration_uploads table for UGC
CREATE TABLE IF NOT EXISTS inspiration_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_inspirations_style ON inspirations(style);
CREATE INDEX IF NOT EXISTS idx_inspirations_room_type ON inspirations(room_type);
CREATE INDEX IF NOT EXISTS idx_inspirations_ai_processed ON inspirations(ai_processed);
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_inspiration_products_inspiration_id ON inspiration_products(inspiration_id);

-- Add RLS policies
ALTER TABLE inspirations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Allow public read access to inspirations" ON inspirations FOR SELECT USING (TRUE);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can manage their own collections" ON user_collections 
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Public collections are readable by everyone" ON user_collections
        FOR SELECT USING (is_public = TRUE);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can manage their own collection items" ON collection_items
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM user_collections 
                WHERE id = collection_id AND user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE inspiration_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Allow public read access to inspiration products" ON inspiration_products FOR SELECT USING (TRUE);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE inspiration_uploads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    CREATE POLICY "Users can view their own uploads" ON inspiration_uploads FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create uploads" ON inspiration_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_inspirations_updated_at BEFORE UPDATE ON inspirations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_user_collections_updated_at BEFORE UPDATE ON user_collections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_inspiration_uploads_updated_at BEFORE UPDATE ON inspiration_uploads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
