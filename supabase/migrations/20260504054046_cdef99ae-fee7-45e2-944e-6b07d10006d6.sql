
CREATE TYPE public.quote_status AS ENUM ('pending', 'answered', 'accepted', 'rejected', 'expired');
CREATE TYPE public.quote_request_type AS ENUM ('product', 'set', 'custom');

CREATE TABLE public.price_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  request_type public.quote_request_type NOT NULL DEFAULT 'product',
  product_id UUID,
  set_id TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  title TEXT NOT NULL,
  description TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  city TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  status public.quote_status NOT NULL DEFAULT 'pending',
  quoted_price NUMERIC,
  seller_note TEXT,
  valid_until TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_quotes_customer ON public.price_quotes(customer_id);
CREATE INDEX idx_price_quotes_profile ON public.price_quotes(profile_id);
CREATE INDEX idx_price_quotes_status ON public.price_quotes(status);

ALTER TABLE public.price_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can create their own quotes" ON public.price_quotes
  FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own quotes" ON public.price_quotes
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own quotes" ON public.price_quotes
  FOR UPDATE USING (auth.uid() = customer_id);

CREATE POLICY "Sellers can view quotes for their shop" ON public.price_quotes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = price_quotes.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Sellers can update quotes for their shop" ON public.price_quotes
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = price_quotes.profile_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all quotes" ON public.price_quotes
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_price_quotes_updated_at
  BEFORE UPDATE ON public.price_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
