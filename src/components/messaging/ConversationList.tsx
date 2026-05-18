import type { ConversationSummary } from "@/data/conversations";
import { ConversationListItem } from "./ConversationListItem";

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  if (conversations.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {conversations.map((c) => (
        <ConversationListItem
          key={c.id}
          conversation={c}
          isSelected={c.id === selectedConversationId}
          onClick={() => onSelectConversation(c.id)}
        />
      ))}
    </div>
  );
}
