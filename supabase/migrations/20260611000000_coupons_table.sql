-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL,
  min_purchase_amount NUMERIC(12,2) DEFAULT 0,
  max_discount_amount NUMERIC(12,2),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to select/read coupons
CREATE POLICY "Allow public read access to coupons" ON public.coupons
  FOR SELECT USING (true);

-- Insert seed data for testing
INSERT INTO public.coupons (code, discount_type, discount_value, min_purchase_amount)
VALUES 
  ('WELCOME10', 'percentage', 10.00, 0.00),
  ('SPRING50', 'fixed', 50000.00, 200000.00)
ON CONFLICT (code) DO NOTHING;
