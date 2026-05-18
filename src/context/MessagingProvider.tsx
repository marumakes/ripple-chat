import { useState, type ReactNode } from "react";
import { MessagingContext } from "@/context/MessagingContext";

/**
 * Provides activeConversationId to the messaging UI tree.
 * Wrap your messaging page (or the whole app) with this.
 */
export function MessagingProvider({ children }: { children: ReactNode }) {
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  return (
    <MessagingContext.Provider
      value={{ activeConversationId, setActiveConversationId }}
    >
      {children}
    </MessagingContext.Provider>
  );
}
