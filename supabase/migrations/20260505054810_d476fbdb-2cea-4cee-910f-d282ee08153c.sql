CREATE TYPE public.installer_specialty AS ENUM ('curtain', 'chandelier', 'cabinet', 'wallpaper', 'flooring', 'painting', 'other');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'completed', 'rejected', 'cancelled');

CREATE TABLE public.installers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  specialties public.installer_specialty[] NOT NULL DEFAULT '{}',
  city TEXT,
  phone TEXT,
  bio TEXT,
  avatar_url TEXT,
  base_rate NUMERIC,
  rating NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.installers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active installers" ON public.installers
  FOR SELECT USING (is_active = true OR auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Users create own installer profile" ON public.installers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Installers update own profile" ON public.installers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage installers" ON public.installers
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_installers_updated_at
  BEFORE UPDATE ON public.installers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.installer_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  installer_id UUID NOT NULL,
  specialty public.installer_specialty NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city TEXT,
  address TEXT,
  description TEXT,
  preferred_date DATE,
  preferred_time_range TEXT,
  final_price NUMERIC,
  installer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.installer_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers create bookings" ON public.installer_bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers view own bookings" ON public.installer_bookings
  FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers update own bookings" ON public.installer_bookings
  FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Installers view own bookings" ON public.installer_bookings
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.installers i WHERE i.id = installer_bookings.installer_id AND i.user_id = auth.uid()));
CREATE POLICY "Installers update own bookings" ON public.installer_bookings
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.installers i WHERE i.id = installer_bookings.installer_id AND i.user_id = auth.uid()));
CREATE POLICY "Admins manage bookings" ON public.installer_bookings
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_installer_bookings_updated_at
  BEFORE UPDATE ON public.installer_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_installers_user ON public.installers(user_id);
CREATE INDEX idx_bookings_customer ON public.installer_bookings(customer_id);
CREATE INDEX idx_bookings_installer ON public.installer_bookings(installer_id);