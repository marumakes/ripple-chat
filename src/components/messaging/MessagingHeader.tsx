import type { ConversationSummary } from "@/data/conversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MessagingHeaderProps {
  conversation: ConversationSummary;
  sidebarOpen: boolean;
}

export function MessagingHeader({
  conversation,
  sidebarOpen,
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
      <div className="flex flex-col min-w-0">
        <span className="text-base font-semibold text-foreground truncate">
          {title}
        </span>
        <span className="text-sm text-muted-foreground">
          {type === "direct" ? "Direct message" : "Group chat"}
        </span>
      </div>
    </div>
  );
}
