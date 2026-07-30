// ====================================================================
// سرویس چت - پیام خصوصی بین خریدار و فروشنده
// ====================================================================

import { supabase } from "@/integrations/supabase/client";

// ---- Types ----

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  product_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  user_id: string;
  brand_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  product_id: string | null;
  product_name?: string | null;
}

// ---- Core Functions ----

/**
 * ارسال پیام جدید
 */
export async function sendMessage(
  sender_id: string,
  receiver_id: string,
  content: string,
  product_id?: string | null,
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id,
      receiver_id,
      content,
      product_id: product_id ?? null,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error("خطا در ارسال پیام:", error);
    return null;
  }

  // Send notification to receiver
  await supabase.rpc("create_notification", {
    _user_id: receiver_id,
    _title: "پیام جدید",
    _body: `یک پیام جدید دریافت کردید.`,
    _type: "chat_new",
    _link: `/messages/${sender_id}`,
    _metadata: { sender_id, product_id: product_id ?? null }
  });

  return data as ChatMessage;
}

/**
 * دریافت تاریخچه گفتگو با یک کاربر
 */
export async function getConversation(
  user_id: string,
  other_user_id: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user_id},receiver_id.eq.${other_user_id}),and(sender_id.eq.${other_user_id},receiver_id.eq.${user_id})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("خطا در دریافت گفتگو:", error);
    return [];
  }

  return (data || []) as ChatMessage[];
}

/**
 * دریافت لیست گفتگوهای کاربر
 */
export async function getConversations(user_id: string): Promise<Conversation[]> {
  // Get all messages where user is sender or receiver, ordered by created_at
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${user_id},receiver_id.eq.${user_id}`)
    .order("created_at", { ascending: false });

  if (error || !messages) {
    console.error("خطا در دریافت گفتگوها:", error);
    return [];
  }

  // Group by the other user
  const conversationMap = new Map<string, ChatMessage[]>();
  
  for (const msg of messages) {
    const otherUserId = msg.sender_id === user_id ? msg.receiver_id : msg.sender_id;
    if (!conversationMap.has(otherUserId)) {
      conversationMap.set(otherUserId, []);
    }
    conversationMap.get(otherUserId)!.push(msg as ChatMessage);
  }

  // Get unique other user ids
  const otherUserIds = Array.from(conversationMap.keys());

  // Fetch profiles for those users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, brand_name")
    .in("id", otherUserIds);

  const profileMap: Record<string, string> = {};
  (profiles || []).forEach((p) => {
    profileMap[p.id] = p.brand_name;
  });

  // Build conversation list
  const conversations: Conversation[] = [];
  
  for (const [otherUserId, msgs] of conversationMap) {
    const lastMsg = msgs[0];
    const unreadCount = msgs.filter(
      (m) => m.sender_id === otherUserId && !m.is_read
    ).length;

    conversations.push({
      user_id: otherUserId,
      brand_name: profileMap[otherUserId] || "کاربر",
      last_message: lastMsg.content,
      last_message_time: lastMsg.created_at,
      unread_count: unreadCount,
      product_id: lastMsg.product_id,
    });
  }

  // Sort by last message time
  conversations.sort(
    (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
  );

  return conversations;
}

/**
 * علامت‌گذاری پیام‌های خوانده شده
 */
export async function markMessagesAsRead(
  user_id: string,
  sender_id: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("sender_id", sender_id)
    .eq("receiver_id", user_id)
    .eq("is_read", false);

  if (error) {
    console.error("خطا در علامت‌گذاری پیام:", error);
  }
}

/**
 * دریافت تعداد پیام‌های خوانده نشده
 */
export async function getUnreadCount(user_id: string): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", user_id)
    .eq("is_read", false);

  if (error) {
    console.error("خطا در دریافت تعداد پیام:", error);
    return 0;
  }

  return count || 0;
}
