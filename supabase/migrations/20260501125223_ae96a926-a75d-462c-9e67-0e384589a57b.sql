-- 1. Roles enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'moderator')
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Add approval/visibility to profiles (shops)
ALTER TABLE public.profiles
  ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN rejection_reason TEXT;

-- Update profiles SELECT policy to hide unapproved/blocked shops from public
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Public can view approved visible profiles"
  ON public.profiles FOR SELECT
  USING (
    (approval_status = 'approved' AND is_visible = true AND is_blocked = false)
    OR auth.uid() = user_id
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete any profile"
  ON public.profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Second-hand listings
CREATE TABLE public.second_hand_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  image_url TEXT,
  city TEXT,
  phone TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.second_hand_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved listings"
  ON public.second_hand_listings FOR SELECT
  USING (approval_status = 'approved' AND is_active = true);

CREATE POLICY "Owners can view their own listings"
  ON public.second_hand_listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all listings"
  ON public.second_hand_listings FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own listings"
  ON public.second_hand_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update their own listings"
  ON public.second_hand_listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any listing"
  ON public.second_hand_listings FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Owners can delete their own listings"
  ON public.second_hand_listings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any listing"
  ON public.second_hand_listings FOR DELETE
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_second_hand_updated_at
  BEFORE UPDATE ON public.second_hand_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Reports (violation reports)
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('shop', 'product', 'listing', 'user')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete reports"
  ON public.reports FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Advertisements
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  placement TEXT NOT NULL DEFAULT 'home_banner' CHECK (placement IN ('home_banner', 'home_sidebar', 'shops_top', 'product_detail')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  click_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active ads"
  ON public.advertisements FOR SELECT
  USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
  );

CREATE POLICY "Admins can view all ads"
  ON public.advertisements FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage ads"
  ON public.advertisements FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Payments (linked to orders)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'cash_on_delivery' CHECK (method IN ('cash_on_delivery', 'card', 'bank_transfer', 'online')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  reference_code TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Sellers can view payments for their shop"
  ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = payments.profile_id AND p.user_id = auth.uid()));

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Customers can create their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Sellers can update payments for their shop"
  ON public.payments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = payments.profile_id AND p.user_id = auth.uid()));

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Admin policies on existing tables (products, orders, inquiries, categories)
CREATE POLICY "Admins can manage all products"
  ON public.products FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update any order"
  ON public.orders FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all inquiries"
  ON public.inquiries FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage categories"
  ON public.producer_categories FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 8. Indexes for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_second_hand_status ON public.second_hand_listings(approval_status, is_active);
CREATE INDEX idx_second_hand_user ON public.second_hand_listings(user_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_target ON public.reports(target_type, target_id);
CREATE INDEX idx_ads_active ON public.advertisements(is_active, placement);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_profiles_approval ON public.profiles(approval_status, is_visible, is_blocked);