-- Enums
CREATE TYPE public.visit_purpose AS ENUM ('renovation', 'interior_design', 'bulk_purchase', 'other');
CREATE TYPE public.visit_status AS ENUM ('pending', 'confirmed', 'rejected', 'completed', 'cancelled');

-- Table
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  purpose public.visit_purpose NOT NULL DEFAULT 'renovation',
  status public.visit_status NOT NULL DEFAULT 'pending',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city TEXT,
  address TEXT,
  description TEXT,
  preferred_date DATE,
  preferred_time_range TEXT,
  confirmed_at TIMESTAMPTZ,
  seller_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers create own visits" ON public.site_visits
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers view own visits" ON public.site_visits
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers update own visits" ON public.site_visits
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Sellers view shop visits" ON public.site_visits
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = site_visits.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Sellers update shop visits" ON public.site_visits
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = site_visits.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins manage visits" ON public.site_visits
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_site_visits_updated_at
  BEFORE UPDATE ON public.site_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_site_visits_customer ON public.site_visits(customer_id);
CREATE INDEX idx_site_visits_profile ON public.site_visits(profile_id);
CREATE INDEX idx_site_visits_status ON public.site_visits(status);