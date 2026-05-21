import { Settings } from "lucide-react";
import type { ConversationSummary } from "@/data/conversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessagingHeaderProps {
  conversation: ConversationSummary;
  sidebarOpen: boolean;
  onSettings?: () => void;
}

export function MessagingHeader({
  conversation,
  sidebarOpen,
  onSettings,
}: MessagingHeaderProps) {
  const { title, avatarUrl, type } = conversation;

  const initials = title
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 2);

  return (
    <div
      className={`flex items-center gap-4 py-4 pr-8 border-b border-border bg-background shrink-0 transition-[padding-left] duration-300 ${
        sidebarOpen ? "pl-8" : "pl-20"
      }`}
    >
      <Avatar className="size-10 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={title} />}
        <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-base font-semibold text-foreground truncate">
          {title}
        </span>
        <span className="text-sm text-muted-foreground">
          {type === "direct" ? "Direct message" : "Group chat"}
        </span>
      </div>
      {type === "group" && onSettings && (
        <button
          onClick={onSettings}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="Group settings"
        >
          <Settings size={18} />
        </button>
      )}
    </div>
  );
}
