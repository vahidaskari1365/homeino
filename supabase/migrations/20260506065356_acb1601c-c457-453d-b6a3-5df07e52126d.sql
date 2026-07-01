ALTER TABLE public.second_hand_listings
  ADD COLUMN is_urgent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN featured_until TIMESTAMPTZ,
  ADD COLUMN urgent_until TIMESTAMPTZ,
  ADD COLUMN bumped_at TIMESTAMPTZ;

CREATE INDEX idx_listings_featured ON public.second_hand_listings(is_featured, featured_until);
CREATE INDEX idx_listings_bumped ON public.second_hand_listings(bumped_at DESC NULLS LAST);

CREATE TYPE public.promotion_type AS ENUM ('urgent', 'featured', 'bump');
CREATE TYPE public.promotion_status AS ENUM ('pending', 'active', 'expired', 'cancelled');

CREATE TABLE public.listing_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.second_hand_listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  promotion_type promotion_type NOT NULL,
  status promotion_status NOT NULL DEFAULT 'active',
  amount NUMERIC NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 7,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_listing ON public.listing_promotions(listing_id);

ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own promotions"
ON public.listing_promotions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners create own promotions"
ON public.listing_promotions FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.second_hand_listings l WHERE l.id = listing_id AND l.user_id = auth.uid()
));

CREATE POLICY "Admins manage promotions"
ON public.listing_promotions FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_listing_promotions_updated_at
BEFORE UPDATE ON public.listing_promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();