-- Consultation type and status enums
CREATE TYPE public.consultation_type AS ENUM ('advice', 'chat', 'custom_design');
CREATE TYPE public.consultation_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');

-- Designers registry
CREATE TABLE public.designers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  specialties TEXT[],
  hourly_rate NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.designers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Designers viewable by everyone" ON public.designers FOR SELECT USING (is_active = true OR auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Admins manage designers" ON public.designers FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Designers update own profile" ON public.designers FOR UPDATE USING (auth.uid() = user_id);

-- Consultations
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  designer_id UUID REFERENCES public.designers(id) ON DELETE SET NULL,
  consultation_type public.consultation_type NOT NULL DEFAULT 'advice',
  status public.consultation_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  room_type TEXT,
  style_preference TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  city TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  designer_note TEXT,
  final_price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers create own consultations" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers view own consultations" ON public.consultations FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers update own consultations" ON public.consultations FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Designers view relevant consultations" ON public.consultations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.designers d WHERE d.user_id = auth.uid() AND (d.id = consultations.designer_id OR consultations.designer_id IS NULL))
);
CREATE POLICY "Designers update assigned consultations" ON public.consultations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.designers d WHERE d.user_id = auth.uid() AND (d.id = consultations.designer_id OR consultations.designer_id IS NULL))
);
CREATE POLICY "Admins manage consultations" ON public.consultations FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_consultations_updated BEFORE UPDATE ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Consultation messages (chat)
CREATE TABLE public.consultation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'designer', 'admin')),
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View messages in own consultations" ON public.consultation_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.consultations c
    WHERE c.id = consultation_messages.consultation_id
    AND (c.customer_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.designers d WHERE d.user_id = auth.uid() AND d.id = c.designer_id))
  ) OR is_admin(auth.uid())
);

CREATE POLICY "Send messages in own consultations" ON public.consultation_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (
      SELECT 1 FROM public.consultations c
      WHERE c.id = consultation_messages.consultation_id
      AND (c.customer_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.designers d WHERE d.user_id = auth.uid() AND d.id = c.designer_id))
    ) OR is_admin(auth.uid())
  )
);

CREATE INDEX idx_consultation_messages_consultation ON public.consultation_messages(consultation_id, created_at);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;