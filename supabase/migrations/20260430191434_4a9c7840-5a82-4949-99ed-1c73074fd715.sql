-- =========================================
-- ORDER STATUS ENUM
-- =========================================
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending','confirmed','shipped','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================
-- ORDERS
-- =========================================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,           -- auth.uid() of the buyer
  profile_id UUID NOT NULL,            -- seller profile (products.profile_id)
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  address TEXT NOT NULL,
  note TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_profile ON public.orders(profile_id, created_at DESC);
CREATE INDEX idx_orders_customer ON public.orders(customer_id, created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can create their own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own orders"
ON public.orders FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Sellers can view orders for their shop"
ON public.orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = orders.profile_id AND p.user_id = auth.uid()
));

CREATE POLICY "Sellers can update orders for their shop"
ON public.orders FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = orders.profile_id AND p.user_id = auth.uid()
));

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- ORDER ITEMS
-- =========================================
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID,                     -- nullable in case product deleted later
  product_name TEXT NOT NULL,          -- snapshot
  unit_price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can insert their own order items"
ON public.order_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id AND o.customer_id = auth.uid()
));

CREATE POLICY "Customers can view their own order items"
ON public.order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id AND o.customer_id = auth.uid()
));

CREATE POLICY "Sellers can view order items for their shop"
ON public.order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders o
  JOIN public.profiles p ON p.id = o.profile_id
  WHERE o.id = order_items.order_id AND p.user_id = auth.uid()
));

-- =========================================
-- INQUIRIES (customer requests / messages)
-- =========================================
CREATE TABLE public.inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  product_id UUID,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inquiries_profile ON public.inquiries(profile_id, created_at DESC);
CREATE INDEX idx_inquiries_customer ON public.inquiries(customer_id, created_at DESC);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can create their own inquiries"
ON public.inquiries FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own inquiries"
ON public.inquiries FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Sellers can view inquiries for their shop"
ON public.inquiries FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = inquiries.profile_id AND p.user_id = auth.uid()
));

CREATE POLICY "Sellers can update inquiry read status"
ON public.inquiries FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = inquiries.profile_id AND p.user_id = auth.uid()
));

-- =========================================
-- PRODUCT VIEWS (analytics)
-- =========================================
CREATE TABLE public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  profile_id UUID NOT NULL,
  viewer_id UUID,                       -- nullable: guests allowed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_views_product ON public.product_views(product_id, created_at DESC);
CREATE INDEX idx_product_views_profile_date ON public.product_views(profile_id, created_at DESC);

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can log a view
CREATE POLICY "Anyone can insert product views"
ON public.product_views FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sellers can view their product analytics"
ON public.product_views FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = product_views.profile_id AND p.user_id = auth.uid()
));

-- =========================================
-- DAILY VIEWS VIEW (last 30 days aggregate)
-- =========================================
CREATE OR REPLACE VIEW public.product_daily_views
WITH (security_invoker = true) AS
SELECT
  profile_id,
  product_id,
  (created_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(*)::int AS views
FROM public.product_views
WHERE created_at >= now() - INTERVAL '30 days'
GROUP BY profile_id, product_id, day;
