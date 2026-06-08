
-- 1) Consultations: prevent customers from pre-assigning a designer at insert time
DROP POLICY IF EXISTS "Customers create own consultations" ON public.consultations;
CREATE POLICY "Customers create own consultations"
ON public.consultations FOR INSERT
WITH CHECK (auth.uid() = customer_id AND designer_id IS NULL);

-- 2) Remove consultations + messages from realtime publication (PII leak via channel subs)
ALTER PUBLICATION supabase_realtime DROP TABLE public.consultations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.consultation_messages;

-- 3) Profiles: drop the broad public SELECT policy. Public must use the public_profiles view.
DROP POLICY IF EXISTS "Public can view approved visible profiles (safe cols)" ON public.profiles;

-- Re-grant full SELECT on profiles to authenticated/anon so column-grant changes don't break the existing view/owner queries.
-- Access is gated by the remaining SELECT policy (owner + admin only).
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;  -- owner/admin policy still filters rows
GRANT ALL ON public.profiles TO service_role;

-- Ensure the safe view exists and is readable by everyone (it already filters columns)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT
  id, user_id, brand_name, city, description, website,
  contact_published, contact_published_at, approval_status,
  is_visible, is_blocked, created_at, updated_at,
  CASE WHEN contact_published THEN contact_name ELSE NULL END AS contact_name,
  CASE WHEN contact_published THEN phone ELSE NULL END AS phone,
  CASE WHEN contact_published THEN address ELSE NULL END AS address
FROM public.profiles
WHERE approval_status = 'approved' AND is_visible = true AND is_blocked = false;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 4) Second-hand listings: hide phone from public via view. Restrict public policy to non-phone access.
DROP POLICY IF EXISTS "Public can view approved listings" ON public.second_hand_listings;

-- Only authenticated users can read the full row (including phone) of approved listings.
CREATE POLICY "Authenticated users view approved listings"
ON public.second_hand_listings FOR SELECT
TO authenticated
USING (approval_status = 'approved' AND is_active = true);

-- Anonymous visitors must use the safe view (no phone)
REVOKE SELECT ON public.second_hand_listings FROM anon;

CREATE OR REPLACE VIEW public.public_second_hand_listings
WITH (security_invoker = true) AS
SELECT
  id, user_id, title, description, price, image_url, city,
  approval_status, is_active, is_featured, is_urgent,
  featured_until, urgent_until, bumped_at, created_at, updated_at
FROM public.second_hand_listings
WHERE approval_status = 'approved' AND is_active = true;

GRANT SELECT ON public.public_second_hand_listings TO anon, authenticated;
