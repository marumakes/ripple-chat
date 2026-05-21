import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  fetchMessages,
  sendMessage,
  deleteMessage,
  subscribeToMessages,
  type Message,
} from "@/data/messages";

type SetMessages = React.Dispatch<React.SetStateAction<Message[]>>;

function handleIncomingMessage(
  event: "INSERT" | "UPDATE",
  message: Message,
  setMessages: SetMessages,
  resetUnread: () => void,
) {
  if (event === "INSERT") {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
    resetUnread();
  }
  if (event === "UPDATE") {
    setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
  }
}

/**
 * Loads and subscribes to messages for one conversation.
 * Exposes send, soft-delete, and load-earlier helpers.
 */
export function useMessages(conversationId: string | null) {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Track which conversations we've already loaded so we don't
  // flash a loading state when switching back to a cached thread.
  const loadedConversations = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading || !user || !conversationId) return;

    const cid = conversationId;
    const resetUnread = () =>
      supabase.rpc("reset_unread_count", { conv_id: cid, uid: user.id });

    const alreadyLoaded = loadedConversations.current.has(cid);

    void (async () => {
      if (!alreadyLoaded) setIsLoading(true);
      setError(null);
      try {
        const { messages: msgs, hasMore: more } = await fetchMessages(cid);
        setMessages(msgs);
        setHasMore(more);
        loadedConversations.current.add(cid);
        await resetUnread();
      } catch (err) {
        setError(err as Error);
        setMessages([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    })();

    const unsubscribe = subscribeToMessages(cid, (event, message) =>
      handleIncomingMessage(event, message, setMessages, resetUnread),
    );

    // On cleanup: unsubscribe the channel but do NOT clear messages.
    return () => {
      void unsubscribe();
    };
  }, [conversationId, user, authLoading]);

  const loadMore = useCallback(async () => {
    if (!conversationId || !messages.length) return;
    const cursor = messages[0].created_at;
    const { messages: older, hasMore: more } = await fetchMessages(conversationId, cursor);
    setMessages((current) => [...older, ...current]);
    setHasMore(more);
  }, [conversationId, messages]);

  const send = useCallback(
    async (content: string) => {
      if (!user) throw new Error("Not authenticated");
      if (!conversationId) return;
      setSendError(null);
      try {
        await sendMessage(conversationId, user.id, content);
      } catch (err) {
        setSendError(
          err instanceof Error ? err.message : "Failed to send message.",
        );
      }
    },
    [conversationId, user],
  );

  const removeMessage = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true } : m)),
    );
    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  return { messages, isLoading, hasMore, error, sendError, send, removeMessage, loadMore };
}
