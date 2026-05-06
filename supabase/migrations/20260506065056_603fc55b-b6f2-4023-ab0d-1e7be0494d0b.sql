-- Designer portfolio table
CREATE TABLE public.designer_portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  designer_id UUID NOT NULL REFERENCES public.designers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_type TEXT,
  year INTEGER,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_designer_portfolio_designer ON public.designer_portfolio(designer_id);

ALTER TABLE public.designer_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio viewable by everyone"
ON public.designer_portfolio FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.designers d WHERE d.id = designer_portfolio.designer_id AND (d.is_active = true OR d.user_id = auth.uid() OR is_admin(auth.uid())))
);

CREATE POLICY "Designers manage own portfolio"
ON public.designer_portfolio FOR ALL
USING (EXISTS (SELECT 1 FROM public.designers d WHERE d.id = designer_portfolio.designer_id AND d.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.designers d WHERE d.id = designer_portfolio.designer_id AND d.user_id = auth.uid()));

CREATE POLICY "Admins manage portfolio"
ON public.designer_portfolio FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_designer_portfolio_updated_at
BEFORE UPDATE ON public.designer_portfolio
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow users to create their own designer profile
CREATE POLICY "Users create own designer profile"
ON public.designers FOR INSERT
WITH CHECK (auth.uid() = user_id);