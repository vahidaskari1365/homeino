import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Notification = Tables<"notifications">;
export type NotificationPreference = Tables<"notification_preferences">;

export const notificationService = {
  async getPreferences(userId: string): Promise<NotificationPreference | null> {
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
       .eq("user_id", userId)
      .maybeSingle();
    if (!data) {
      const { data: created } = await supabase
        .from("notification_preferences")
        .insert({ user_id: userId })
        .select()
        .single();
      return created as NotificationPreference | null;
    }
    return data as NotificationPreference | null;
  },

  async updatePreferences(userId: string, prefs: Partial<Omit<NotificationPreference, "id" | "user_id" | "created_at" | "updated_at">>): Promise<boolean> {
    const { error } = await supabase
      .from("notification_preferences")
      .update(prefs)
      .eq("user_id", userId);
    return !error;
  },

  async markRead(id: string): Promise<void> {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  },

  async markAllRead(userId: string): Promise<void> {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  },

  async delete(id: string): Promise<void> {
    await supabase.from("notifications").delete().eq("id", id);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    return count ?? 0;
  },
};
