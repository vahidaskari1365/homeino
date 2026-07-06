import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { auditService, type AuditLog, type AuditLogFilter } from "@/services/auditService";

export function useAuditLogs(filters?: AuditLogFilter) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await auditService.search(filters ?? {});
    setLogs(result.logs);
    setTotal(result.total);
    setLoading(false);
  }, [filters?.actor_id, filters?.actor_type, filters?.target_type, filters?.action, filters?.from_date, filters?.to_date, filters?.limit, filters?.offset]);

  useEffect(() => { load(); }, [load]);

  return { logs, total, loading, refresh: load };
}

export function useRecentAuditLogs(limit = 50) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const l = await auditService.getRecent(limit);
    setLogs(l);
    setLoading(false);
  }, [limit]);

  useEffect(() => { load(); }, [load]);

  return { logs, loading, refresh: load };
}

const ACTOR_LABELS: Record<string, string> = {
  user: "کاربر",
  seller: "فروشنده",
  admin: "مدیر",
  system: "سیستم",
};

export function getActorLabel(type: string): string {
  return ACTOR_LABELS[type] ?? type;
}

export function getActionLabel(action: string): string {
  const map: Record<string, string> = {
    profile_updated: "بروزرسانی پروفایل",
    address_changed: "تغییر آدرس",
    room_image_uploaded: "آپلود تصویر اتاق",
    design_deleted: "حذف طراحی",
    token_consumed: "مصرف توکن",
    product_created: "ایجاد محصول",
    product_updated: "بروزرسانی محصول",
    product_deleted: "حذف محصول",
    inventory_changed: "تغییر موجودی",
    price_changed: "تغییر قیمت",
    images_updated: "بروزرسانی تصاویر",
    subscription_upgraded: "ارتقا اشتراک",
    subscription_modified: "تغییر اشتراک",
    user_role_changed: "تغییر نقش کاربر",
    account_suspended: "تعلیق حساب",
    advertisement_deleted: "حذف تبلیغ",
    advertisement_restored: "بازیابی تبلیغ",
    ai_design_generated: "تولید طراحی هوش مصنوعی",
    ai_failure: "خطای هوش مصنوعی",
    edge_function_error: "خطای تابع لبه",
    auth_event: "رویداد احراز هویت",
    permission_denied: "عدم دسترسی",
    security_event: "رویداد امنیتی",
  };
  return map[action] ?? action;
}
