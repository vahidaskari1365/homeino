-- Enum for wishlist item types
CREATE TYPE public.wishlist_item_type AS ENUM ('product', 'set', 'ai_design');

CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type public.wishlist_item_type NOT NULL,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);

CREATE INDEX idx_wishlists_user ON public.wishlists(user_id, item_type, created_at DESC);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist"
  ON public.wishlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own wishlist"
  ON public.wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own wishlist"
  ON public.wishlists FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wishlists"
  ON public.wishlists FOR SELECT
  USING (public.is_admin(auth.uid()));