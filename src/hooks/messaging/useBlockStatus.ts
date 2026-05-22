import { useState, useEffect, useCallback } from "react";
import { blockUser, unblockUser, getDmBlockStatus } from "@/data/blocks";

export function useBlockStatus(
  conversationId: string | null,
  conversationType: "direct" | "group" | undefined,
  recipientId: string | undefined,
) {
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId || conversationType !== "direct") {
      setIBlockedThem(false);
      setTheyBlockedMe(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getDmBlockStatus(conversationId)
      .then((status) => {
        if (cancelled) return;
        setIBlockedThem(status.iBlockedThem);
        setTheyBlockedMe(status.theyBlockedMe);
      })
      .catch(() => {
        // Non-fatal; leave as unblocked
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, conversationType]);

  const block = useCallback(async () => {
    if (!recipientId) return;
    await blockUser(recipientId);
    setIBlockedThem(true);
  }, [recipientId]);

  const unblock = useCallback(async () => {
    if (!recipientId) return;
    await unblockUser(recipientId);
    setIBlockedThem(false);
  }, [recipientId]);

  return {
    iBlockedThem,
    theyBlockedMe,
    isBlocked: iBlockedThem || theyBlockedMe,
    loading,
    block,
    unblock,
  };
}
