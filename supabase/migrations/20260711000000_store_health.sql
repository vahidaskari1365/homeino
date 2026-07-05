-- Homeino — Phase 5: Store Health System
-- ============================================================
-- Analyzes store products and returns actionable health
-- suggestions. Checks: missing dimensions, poor quality images,
-- missing materials, missing colors, low AI rec rate, low CTR,
-- outdated prices, products without category, missing description,
-- missing style, missing tags.
--
-- STRICT COMPLIANCE:
--   - Does NOT touch AI/Gemini pipeline tables
--   - Read-only analysis of existing product data
-- ============================================================

-- ------------------------------------------------------------
-- 1. FUNCTION: get_store_health_report
-- Returns a comprehensive health analysis with actionable
-- suggestions for a store's products.
-- ------------------------------------------------------------
create or replace function public.get_store_health_report(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_products int;
  v_missing_dimensions int;
  v_no_image int;
  v_low_quality_image int;
  v_missing_materials int;
  v_missing_colors int;
  v_missing_category int;
  v_missing_description int;
  v_missing_style int;
  v_missing_tags int;
  v_no_price int;
  v_zero_price int;
  v_low_ctr_products int;
  v_low_ai_rec_products int;
  v_old_products int;
  v_issues jsonb;
  v_suggestions jsonb;
  v_score numeric;
  v_total_issues int;
begin
  if not exists (
    select 1 from public.stores
    where id = p_store_id and (owner_id = auth.uid() or public.is_admin(auth.uid()))
  ) then
    raise exception 'not_authorized';
  end if;

  -- Count total active products
  select count(*) into v_total_products
  from public.products
  where store_id = p_store_id and is_active = true;

  -- 1. Missing dimensions (width, height, or depth is null)
  select count(*) into v_missing_dimensions
  from public.products
  where store_id = p_store_id and is_active = true
    and (width is null or height is null or depth is null);

  -- 2. No image or poor quality image
  select count(*) into v_no_image
  from public.products
  where store_id = p_store_id and is_active = true
    and (image_url is null or image_url = '');

  select count(*) into v_low_quality_image
  from public.products
  where store_id = p_store_id and is_active = true
    and image_url is not null
    and image_url !~ '\.(jpg|jpeg|png|webp|avif)($|\?)';

  -- 3. Missing materials (attributes doesn't contain 'material' key)
  select count(*) into v_missing_materials
  from public.products
  where store_id = p_store_id and is_active = true
    and (attributes is null or attributes = '{}'::jsonb or not (attributes ? 'material'));

  -- 4. Missing colors (attributes doesn't contain 'color' key and tags don't include colors)
  select count(*) into v_missing_colors
  from public.products
  where store_id = p_store_id and is_active = true
    and (attributes is null or attributes = '{}'::jsonb or not (attributes ? 'color'))
    and (tags is null or array_length(tags, 1) is null or not (array_length(tags, 1) > 0));

  -- 5. Missing category
  select count(*) into v_missing_category
  from public.products
  where store_id = p_store_id and is_active = true
    and (category_id is null);

  -- 6. Missing description
  select count(*) into v_missing_description
  from public.products
  where store_id = p_store_id and is_active = true
    and (description is null or description = '');

  -- 7. Missing style
  select count(*) into v_missing_style
  from public.products
  where store_id = p_store_id and is_active = true
    and (style is null or style = '');

  -- 8. Missing tags
  select count(*) into v_missing_tags
  from public.products
  where store_id = p_store_id and is_active = true
    and (tags is null or array_length(tags, 1) is null or array_length(tags, 1) = 0);

  -- 9. No price set
  select count(*) into v_no_price
  from public.products
  where store_id = p_store_id and is_active = true
    and (price is null);

  -- 10. Zero price (likely placeholder)
  select count(*) into v_zero_price
  from public.products
  where store_id = p_store_id and is_active = true
    and price = 0;

  -- 11. Low CTR products (from analytics)
  select count(*) into v_low_ctr_products
  from public.products p
  where p.store_id = p_store_id and p.is_active = true
    and (
      select count(*) from public.product_views pv where pv.product_id = p.id
    ) > 0
    and (
      coalesce((
        select count(*)::numeric from public.analytics_events ae
        where ae.event_type = 'product_clicked' and ae.entity_type = 'product' and ae.entity_id = p.id
      ), 0) / nullif((
        select count(*)::numeric from public.product_views pv where pv.product_id = p.id
      ), 0) * 100
    ) < 2.0;

  -- 12. Low AI recommendation rate
  select count(*) into v_low_ai_rec_products
  from public.products p
  where p.store_id = p_store_id and p.is_active = true
    and (
      select count(*) from public.placements pl where pl.product_id = p.id
    ) = 0;

  -- 13. Old products (no updates in 90+ days, has at least one view)
  select count(*) into v_old_products
  from public.products p
  where p.store_id = p_store_id and p.is_active = true
    and p.created_at < now() - interval '90 days'
    and exists (select 1 from public.product_views pv where pv.product_id = p.id)
    and not exists (
      select 1 from public.analytics_events ae
      where ae.event_type = 'product_clicked' and ae.entity_type = 'product' and ae.entity_id = p.id
      and ae.created_at > now() - interval '30 days'
    );

  -- Calculate total issues (weighted)
  v_total_issues := v_missing_dimensions + v_no_image + v_missing_materials
    + v_missing_colors + v_missing_category + v_missing_description
    + v_missing_style + v_missing_tags + v_no_price + v_zero_price;

  -- Calculate health score (0-100)
  if v_total_products = 0 then
    v_score := 0;
  else
    v_score := round(
      (1.0 - least(v_total_issues::numeric / (v_total_products * 10), 1.0)) * 100 *
      case when v_total_products <= 5 then 0.7 else 1.0 end *
      case when v_low_ctr_products > 0 then 0.9 else 1.0 end *
      case when v_low_ai_rec_products > v_total_products / 2 then 0.85 else 1.0 end
    , 0);
  end if;

  -- Build issues array
  v_issues := jsonb_build_array();

  if v_missing_dimensions > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'missing_dimensions',
      'severity', case when v_missing_dimensions::float / nullif(v_total_products, 0) > 0.5 then 'high' else 'medium' end,
      'count', v_missing_dimensions,
      'label', 'ابعاد缺失',
      'description', format('%s محصول فاقد ابعاد (طول، عرض یا ارتفاع) هستند', v_missing_dimensions),
      'suggestion', 'برای هر محصول طول، عرض و ارتفاع را به سانتی‌متر وارد کنید',
      'icon', 'ruler'
    );
  end if;

  if v_no_image > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'no_image',
      'severity', 'high',
      'count', v_no_image,
      'label', 'تصویر缺失',
      'description', format('%s محصول تصویر ندارند', v_no_image),
      'suggestion', 'برای هر محصول یک تصویر با کیفیت بالا (JPG یا PNG) آپلود کنید',
      'icon', 'image'
    );
  end if;

  if v_missing_materials > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'missing_materials',
      'severity', case when v_missing_materials::float / nullif(v_total_products, 0) > 0.5 then 'high' else 'medium' end,
      'count', v_missing_materials,
      'label', 'جنس缺失',
      'description', format('%s محصول جنس (متریال) ثبت نشده', v_missing_materials),
      'suggestion', 'جنس محصول را در ویژگی‌ها وارد کنید (مثلاً: چوب، فلز، پارچه)',
      'icon', 'ruler'
    );
  end if;

  if v_missing_colors > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'missing_colors',
      'severity', 'medium',
      'count', v_missing_colors,
      'label', 'رنگ缺失',
      'description', format('%s محصول رنگ ثبت نشده', v_missing_colors),
      'suggestion', 'رنگ‌های محصول را در ویژگی‌ها یا برچسب‌ها وارد کنید',
      'icon', 'palette'
    );
  end if;

  if v_missing_category > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'missing_category',
      'severity', 'high',
      'count', v_missing_category,
      'label', 'دسته‌بندی缺失',
      'description', format('%s محصول دسته‌بندی نشده‌اند', v_missing_category),
      'suggestion', 'برای هر محصول یک دسته‌بندی انتخاب کنید تا در جستجو قابل پیدا شدن باشند',
      'icon', 'folder'
    );
  end if;

  if v_missing_description > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'missing_description',
      'severity', 'medium',
      'count', v_missing_description,
      'label', 'توضیحات缺失',
      'description', format('%s محصول توضیحات ندارند', v_missing_description),
      'suggestion', 'توضیحات کامل و جذاب برای هر محصول بنویسید (شامل ابعاد، جنس، کاربرد)',
      'icon', 'file-text'
    );
  end if;

  if v_missing_style > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'missing_style',
      'severity', 'medium',
      'count', v_missing_style,
      'label', 'سبک缺失',
      'description', format('%s محصول سبک دکوراسیون ثبت نشده', v_missing_style),
      'suggestion', 'سبک محصول را مشخص کنید (مدرن، کلاسیک، مینیمال و ...)',
      'icon', 'sparkles'
    );
  end if;

  if v_missing_tags > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'missing_tags',
      'severity', 'low',
      'count', v_missing_tags,
      'label', 'برچسب缺失',
      'description', format('%s محصول برچسب (تگ) ندارند', v_missing_tags),
      'suggestion', 'برچسب‌های مرتبط اضافه کنید (مثلاً: مبلمان اداری، ناهارخوری مدرن)',
      'icon', 'tag'
    );
  end if;

  if v_no_price > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'no_price',
      'severity', 'high',
      'count', v_no_price,
      'label', 'قیمت缺失',
      'description', format('%s محصول قیمت ندارند', v_no_price),
      'suggestion', 'برای همه محصولات قیمت تعیین کنید',
      'icon', 'dollar-sign'
    );
  end if;

  if v_low_ctr_products > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'low_ctr',
      'severity', 'medium',
      'count', v_low_ctr_products,
      'label', 'CTR پایین',
      'description', format('%s محصول نرخ کلیک پایینی دارند (کمتر از ۲٪)', v_low_ctr_products),
      'suggestion', 'تصاویر محصولات را بهبود دهید، توضیحات جذاب‌تر بنویسید و قیمت‌ها را رقابتی کنید',
      'icon', 'mouse-pointer-click'
    );
  end if;

  if v_low_ai_rec_products > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'low_ai_recommendation',
      'severity', 'medium',
      'count', v_low_ai_rec_products,
      'label', 'عدم پیشنهاد هوش مصنوعی',
      'description', format('%s محصول توسط هوش مصنوعی پیشنهاد نشده‌اند', v_low_ai_rec_products),
      'suggestion', 'تصاویر با کیفیت و ابعاد دقیق آپلود کنید تا شانس پیشنهاد توسط هوش مصنوعی افزایش یابد',
      'icon', 'sparkles'
    );
  end if;

  if v_old_products > 0 then
    v_issues := v_issues || jsonb_build_object(
      'type', 'stale_products',
      'severity', 'low',
      'count', v_old_products,
      'label', 'محصولات قدیمی',
      'description', format('%s محصول بیش از ۳ ماه بدون تعامل هستند', v_old_products),
      'suggestion', 'تصاویر و توضیحات این محصولات را به‌روز کنید یا قیمت‌های جدید تعیین کنید',
      'icon', 'clock'
    );
  end if;

  -- Build top suggestions (prioritized, max 5)
  v_suggestions := jsonb_build_array();

  if v_no_image > 0 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 1,
      'action', 'آپلود تصویر محصولات',
      'detail', format('%s محصول نیاز به تصویر دارند', v_no_image),
      'impact', 'افزایش بازدید و جذابیت'
    );
  end if;

  if v_missing_dimensions > 0 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 2,
      'action', 'افزودن ابعاد محصولات',
      'detail', format('%s محصول ابعاد ندارند', v_missing_dimensions),
      'impact', 'افزایش پیشنهاد هوش مصنوعی'
    );
  end if;

  if v_missing_materials > 0 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 3,
      'action', 'ثبت جنس و متریال',
      'detail', format('%s محصول جنس ثبت نشده', v_missing_materials),
      'impact', 'بهبود دقت جستجو'
    );
  end if;

  if v_missing_category > 0 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 4,
      'action', 'دسته‌بندی محصولات',
      'detail', format('%s محصول دسته‌بندی نشده', v_missing_category),
      'impact', 'قابل پیدا شدن در جستجو'
    );
  end if;

  if v_no_price > 0 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 5,
      'action', 'تعیین قیمت',
      'detail', format('%s محصول قیمت ندارند', v_no_price),
      'impact', 'افزایش فروش'
    );
  end if;

  if v_missing_description > 0 and jsonb_array_length(v_suggestions) < 5 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 6,
      'action', 'افزودن توضیحات محصول',
      'detail', format('%s محصول توضیحات ندارند', v_missing_description),
      'impact', 'بهبود سئو و جذابیت'
    );
  end if;

  if v_missing_style > 0 and jsonb_array_length(v_suggestions) < 5 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 7,
      'action', 'ثبت سبک دکوراسیون',
      'detail', format('%s محصول سبک ندارند', v_missing_style),
      'impact', 'افزایش پیشنهاد هوش مصنوعی'
    );
  end if;

  if v_missing_tags > 0 and jsonb_array_length(v_suggestions) < 5 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 8,
      'action', 'افزودن برچسب',
      'detail', format('%s محصول برچسب ندارند', v_missing_tags),
      'impact', 'بهبود دسته‌بندی'
    );
  end if;

  if v_low_ctr_products > 0 and jsonb_array_length(v_suggestions) < 5 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 9,
      'action', 'بهبود تصاویر محصولات',
      'detail', format('%s محصول نرخ کلیک پایین دارند', v_low_ctr_products),
      'impact', 'افزایش کلیک و فروش'
    );
  end if;

  if v_old_products > 0 and jsonb_array_length(v_suggestions) < 5 then
    v_suggestions := v_suggestions || jsonb_build_object(
      'priority', 10,
      'action', 'به‌روزرسانی محصولات قدیمی',
      'detail', format('%s محصول قدیمی هستند', v_old_products),
      'impact', 'افزایش تعامل'
    );
  end if;

  return jsonb_build_object(
    'store_id', p_store_id,
    'total_products', v_total_products,
    'health_score', v_score,
    'health_label', case
      when v_score >= 80 then 'عالی'
      when v_score >= 60 then 'خوب'
      when v_score >= 40 then 'نیاز به بهبود'
      when v_score >= 20 then 'ضعیف'
      else 'بحرانی'
    end,
    'total_issues', v_total_issues,
    'issues', v_issues,
    'suggestions', v_suggestions,
    'summary', case
      when v_total_products = 0 then 'فروشگاه شما محصولی ندارد. برای شروع، محصولات خود را اضافه کنید.'
      when v_score >= 80 then format('فروشگاه شما در وضعیت %s قرار دارد. %s مشکل جزئی قابل بهبود است.', 'عالی', v_total_issues)
      when v_score >= 60 then format('فروشگاه شما در وضعیت %s قرار دارد. %s مشکل نیاز به رسیدگی دارد.', 'خوب', v_total_issues)
      when v_score >= 40 then format('فروشگاه شما نیاز به بهبود دارد. %s مشکل باید برطرف شود.', v_total_issues)
      else format('وضعیت فروشگاه %s بحرانی است. %s مشکل فوری باید برطرف شود.', 'شما', v_total_issues)
    end
  );
end;
$$;