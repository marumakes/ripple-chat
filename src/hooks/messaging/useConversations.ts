import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  getMyConversations,
  type ConversationSummary,
} from "@/data/conversations";

function buildChannel(userId: string, onUpdate: () => void) {
  return supabase
    .channel(`conversations:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      onUpdate,
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversation_participants",
        filter: `user_id=eq.${userId}`,
      },
      onUpdate,
    )
    .subscribe();
}

/**
 * Keeps the conversation list in sync via an initial fetch and
 * Supabase Realtime listeners on conversations and participants.
 *
 * @returns Conversations array, loading/error state, and a refetch helper.
 */
export function useConversations() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    const userId = user.id;

    const load = async () => {
      // Only show loading skeleton on the very first fetch.
      // Subsequent refetches (from realtime events) update silently.
      if (!hasFetched.current) setIsLoading(true);
      setError(null);
      try {
        const data = await getMyConversations(userId);
        if (!cancelled) {
          setConversations(data);
          hasFetched.current = true;
        }
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    const channel = buildChannel(userId, () => {
      if (!cancelled) void load();
    });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [authLoading, user]);

  return { conversations, isLoading, error };
}
