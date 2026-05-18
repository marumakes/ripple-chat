import { createContext } from "react";

export type MessagingContextType = {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
};

export const MessagingContext = createContext<MessagingContextType | null>(
  null,
);
