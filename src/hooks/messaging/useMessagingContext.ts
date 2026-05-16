import { useContext } from "react";
import {
  MessagingContext,
  type MessagingContextType,
} from "@/context/MessagingContext";

/**
 * Returns the active conversation id and its setter.
 * Must be used within MessagingProvider.
 */
export function useMessagingContext(): MessagingContextType {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error(
      "useMessagingContext must be used within MessagingProvider",
    );
  }
  return context;
}
