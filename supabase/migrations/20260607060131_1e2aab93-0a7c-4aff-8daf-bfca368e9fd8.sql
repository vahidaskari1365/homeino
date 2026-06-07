
-- ============ CONSULTATIONS: restrict designer access ============
DROP POLICY IF EXISTS "Designers view relevant consultations" ON public.consultations;
DROP POLICY IF EXISTS "Designers update assigned consultations" ON public.consultations;

CREATE POLICY "Designers view assigned consultations"
ON public.consultations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.designers d
    WHERE d.user_id = auth.uid() AND d.id = consultations.designer_id
  )
);

CREATE POLICY "Designers update own assigned consultations"
ON public.consultations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.designers d
    WHERE d.user_id = auth.uid() AND d.id = consultations.designer_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.designers d
    WHERE d.user_id = auth.uid() AND d.id = consultations.designer_id
  )
);

-- ============ PRODUCT_VIEWS: prevent viewer_id spoofing ============
DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;

CREATE POLICY "Insert product views with valid viewer"
ON public.product_views FOR INSERT
WITH CHECK (
  (viewer_id IS NULL AND auth.uid() IS NULL)
  OR (viewer_id = auth.uid())
);

-- ============ PROFILES: hide sensitive contact columns from public ============
DROP POLICY IF EXISTS "Public can view approved visible profiles" ON public.profiles;

-- Owner and admin can still see full row
CREATE POLICY "Owners and admins view full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- Revoke broad column access from anon/authenticated, then grant only safe cols
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, brand_name, city, description, website,
  contact_published, contact_published_at, approval_status,
  is_visible, is_blocked, created_at, updated_at
) ON public.profiles TO anon, authenticated;

-- Re-allow public to see approved visible profile rows (column grants restrict what's readable)
CREATE POLICY "Public can view approved visible profiles (safe cols)"
ON public.profiles FOR SELECT
USING (approval_status = 'approved' AND is_visible = true AND is_blocked = false);

-- Safe view that conditionally exposes contact fields only when contact_published = true
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
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
