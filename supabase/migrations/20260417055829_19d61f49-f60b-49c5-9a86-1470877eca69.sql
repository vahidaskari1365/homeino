-- Producer activity categories (seed data)
CREATE TABLE public.producer_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.producer_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
ON public.producer_categories FOR SELECT
USING (true);

INSERT INTO public.producer_categories (name, slug) VALUES
  ('مبلمان', 'furniture'),
  ('فرش و قالی', 'carpet'),
  ('لوستر و روشنایی', 'lighting'),
  ('پرده', 'curtain'),
  ('کالای خواب', 'bedding'),
  ('دکور و کالای چوبی', 'wood-decor'),
  ('تابلو و آثار هنری', 'art'),
  ('سرویس بهداشتی و حمام', 'bathroom'),
  ('اکسسوری خانه', 'accessories'),
  ('لوازم آشپزخانه', 'kitchen'),
  ('گل و گیاه', 'plants'),
  ('طراحی و بازسازی خانه', 'design-renovation');

-- Producer profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  description TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- Junction table: producer <-> categories (many-to-many)
CREATE TABLE public.profile_categories (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.producer_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, category_id)
);

ALTER TABLE public.profile_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile categories are viewable by everyone"
ON public.profile_categories FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own profile categories"
ON public.profile_categories FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_categories.profile_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_categories.profile_id AND p.user_id = auth.uid()
  )
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup using metadata from sign-up form
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_profile_id UUID;
  cat_slug TEXT;
BEGIN
  -- Only create a profile if brand_name is provided in metadata (i.e. producer signup)
  IF NEW.raw_user_meta_data ? 'brand_name' THEN
    INSERT INTO public.profiles (user_id, brand_name, contact_name, phone, city)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'brand_name',
      NEW.raw_user_meta_data->>'contact_name',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'city'
    )
    RETURNING id INTO new_profile_id;

    -- Link selected categories (passed as JSON array of slugs)
    IF NEW.raw_user_meta_data ? 'category_slugs' THEN
      FOR cat_slug IN SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'category_slugs')
      LOOP
        INSERT INTO public.profile_categories (profile_id, category_id)
        SELECT new_profile_id, id FROM public.producer_categories WHERE slug = cat_slug
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();