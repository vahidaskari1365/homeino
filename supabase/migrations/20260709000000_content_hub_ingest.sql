-- Content Hub Ingest: relax style/room_type to TEXT for flexibility

ALTER TABLE inspirations ALTER COLUMN style TYPE TEXT;
ALTER TABLE inspirations ALTER COLUMN room_type TYPE TEXT;

-- Create inspiration-images bucket if needed
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspiration-images', 'inspiration-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on the bucket
CREATE POLICY IF NOT EXISTS "Public Read inspiration-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'inspiration-images');

-- Allow service role full access (for edge functions)
CREATE POLICY IF NOT EXISTS "Service Role All inspiration-images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'inspiration-images' AND auth.role() = 'service_role');
