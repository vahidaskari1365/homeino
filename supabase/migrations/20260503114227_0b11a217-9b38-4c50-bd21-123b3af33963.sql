
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 0;
