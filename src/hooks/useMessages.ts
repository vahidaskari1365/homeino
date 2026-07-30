import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getConversations,
  getConversation,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  type ChatMessage,
  type Conversation,
} from "@/services/chatService";

export function useMessages(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const data = await getConversations(userId);
    setConversations(data);
    setLoading(false);
  }, [userId]);

  const fetchConversation = useCallback(async (otherUserId: string) => {
    if (!userId) return;
    const data = await getConversation(userId, otherUserId);
    setCurrentChat(data);
    // Mark as read
    await markMessagesAsRead(userId, otherUserId);
    // Refresh conversations to update unread counts
    await fetchConversations();
  }, [userId, fetchConversations]);

  const send = useCallback(async (receiverId: string, content: string, productId?: string | null) => {
    if (!userId) return null;
    const msg = await sendMessage(userId, receiverId, content, productId);
    if (msg) {
      setCurrentChat((prev) => [...prev, msg]);
    }
    return msg;
  }, [userId]);

  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    const count = await getUnreadCount(userId);
    setUnreadCount(count);
  }, [userId]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          fetchUnread();
          fetchConversations();
        }
      )
      .subscribe();

    fetchConversations();
    fetchUnread();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchConversations, fetchUnread]);

  return {
    conversations,
    currentChat,
    unreadCount,
    loading,
    fetchConversation,
    fetchConversations,
    send,
    fetchUnread,
  };
}
