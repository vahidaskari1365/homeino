
-- 1) Enum برای نوع اعلان
CREATE TYPE public.notification_type AS ENUM (
  'order_new',
  'order_status',
  'review_new',
  'quote_new',
  'consultation_new',
  'consultation_message',
  'site_visit_new',
  'inquiry_new',
  'system'
);

-- 2) جدول اعلان‌ها
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- 3) GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 4) RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- INSERT با security definer از طریق تریگر انجام می‌شود؛ کلاینت‌ها مجاز به درج مستقیم نیستند
-- اما برای پشتیبانی از insert از edge function:
CREATE POLICY "Service role inserts"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (false); -- درج‌های مستقیم از کلاینت ممنوع — فقط از طریق توابع SECURITY DEFINER

-- 5) تابع کمکی برای ساخت اعلان (SECURITY DEFINER تا از تریگر کار کند)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type public.notification_type,
  _title TEXT,
  _body TEXT DEFAULT NULL,
  _link TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, link, metadata)
  VALUES (_user_id, _type, _title, _body, _link, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- 6) تریگر: سفارش جدید → اعلان به فروشنده
CREATE OR REPLACE FUNCTION public.notify_order_new()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  seller_user_id UUID;
BEGIN
  SELECT user_id INTO seller_user_id FROM public.profiles WHERE id = NEW.profile_id;
  PERFORM public.create_notification(
    seller_user_id, 'order_new',
    'سفارش جدید دریافت شد',
    'یک سفارش جدید به ارزش ' || NEW.total_amount::TEXT || ' تومان دریافت کردید.',
    '/dashboard',
    jsonb_build_object('order_id', NEW.id, 'amount', NEW.total_amount)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_order_new
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_new();

-- 7) تریگر: تغییر وضعیت سفارش → اعلان به مشتری
CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.create_notification(
      NEW.customer_id, 'order_status',
      'وضعیت سفارش شما به‌روزرسانی شد',
      'وضعیت سفارش به «' || NEW.status::TEXT || '» تغییر کرد.',
      '/dashboard',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_order_status
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

-- 8) تریگر: نظر جدید → اعلان به صاحب پروفایل
CREATE OR REPLACE FUNCTION public.notify_review_new()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_user_id UUID;
BEGIN
  SELECT user_id INTO owner_user_id FROM public.profiles WHERE id = NEW.profile_id;
  IF owner_user_id IS NOT NULL AND owner_user_id <> NEW.user_id THEN
    PERFORM public.create_notification(
      owner_user_id, 'review_new',
      'نظر جدید ثبت شد',
      'یک نظر ' || NEW.rating::TEXT || ' ستاره دریافت کردید.',
      '/dashboard',
      jsonb_build_object('review_id', NEW.id, 'rating', NEW.rating, 'target_type', NEW.target_type)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_review_new
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.notify_review_new();

-- 9) تریگر: درخواست قیمت → فروشنده
CREATE OR REPLACE FUNCTION public.notify_quote_new()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  seller_user_id UUID;
BEGIN
  SELECT user_id INTO seller_user_id FROM public.profiles WHERE id = NEW.profile_id;
  PERFORM public.create_notification(
    seller_user_id, 'quote_new',
    'درخواست استعلام قیمت جدید',
    'یک درخواست استعلام قیمت دریافت کردید.',
    '/dashboard',
    jsonb_build_object('quote_id', NEW.id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_quote_new
AFTER INSERT ON public.price_quotes
FOR EACH ROW EXECUTE FUNCTION public.notify_quote_new();

-- 10) تریگر: درخواست بازدید → فروشنده
CREATE OR REPLACE FUNCTION public.notify_site_visit_new()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  seller_user_id UUID;
BEGIN
  SELECT user_id INTO seller_user_id FROM public.profiles WHERE id = NEW.profile_id;
  PERFORM public.create_notification(
    seller_user_id, 'site_visit_new',
    'درخواست بازدید حضوری جدید',
    'یک درخواست بازدید جدید دریافت کردید.',
    '/dashboard',
    jsonb_build_object('site_visit_id', NEW.id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_site_visit_new
AFTER INSERT ON public.site_visits
FOR EACH ROW EXECUTE FUNCTION public.notify_site_visit_new();

-- 11) تریگر: درخواست مشاوره → طراح (در صورت اختصاص)
CREATE OR REPLACE FUNCTION public.notify_consultation_new()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  designer_user_id UUID;
BEGIN
  IF NEW.designer_id IS NOT NULL THEN
    SELECT user_id INTO designer_user_id FROM public.designers WHERE id = NEW.designer_id;
    PERFORM public.create_notification(
      designer_user_id, 'consultation_new',
      'درخواست مشاوره جدید',
      'یک درخواست مشاوره دکوراسیون دریافت کردید.',
      '/consultations',
      jsonb_build_object('consultation_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_consultation_new
AFTER INSERT ON public.consultations
FOR EACH ROW EXECUTE FUNCTION public.notify_consultation_new();

-- 12) تریگر: پیام جدید در مشاوره → طرف مقابل
CREATE OR REPLACE FUNCTION public.notify_consultation_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c RECORD;
  recipient UUID;
  designer_user_id UUID;
BEGIN
  SELECT customer_id, designer_id INTO c FROM public.consultations WHERE id = NEW.consultation_id;
  IF NEW.sender_id = c.customer_id THEN
    IF c.designer_id IS NOT NULL THEN
      SELECT user_id INTO designer_user_id FROM public.designers WHERE id = c.designer_id;
      recipient := designer_user_id;
    END IF;
  ELSE
    recipient := c.customer_id;
  END IF;
  PERFORM public.create_notification(
    recipient, 'consultation_message',
    'پیام جدید در مشاوره',
    'یک پیام جدید در گفت‌وگوی مشاوره دریافت کردید.',
    '/consultations',
    jsonb_build_object('consultation_id', NEW.consultation_id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_consultation_message
AFTER INSERT ON public.consultation_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_consultation_message();

-- 13) تریگر: استعلام → فروشنده
CREATE OR REPLACE FUNCTION public.notify_inquiry_new()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  seller_user_id UUID;
BEGIN
  SELECT user_id INTO seller_user_id FROM public.profiles WHERE id = NEW.profile_id;
  PERFORM public.create_notification(
    seller_user_id, 'inquiry_new',
    'پیام جدید از مشتری',
    'یک پیام/استعلام جدید دریافت کردید.',
    '/dashboard',
    jsonb_build_object('inquiry_id', NEW.id)
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_inquiry_new
AFTER INSERT ON public.inquiries
FOR EACH ROW EXECUTE FUNCTION public.notify_inquiry_new();
