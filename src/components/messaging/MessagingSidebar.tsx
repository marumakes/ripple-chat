import { useState, useEffect } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { getProfile } from "@/data/profile";
import type { ConversationSummary } from "@/data/conversations";
import { ConversationList } from "./ConversationList";
import { NewConversationModal } from "./NewConversationModal";
import { ProfileModal } from "./ProfileModal";

interface MessagingSidebarProps {
  open: boolean;
  onToggle: () => void;
  conversations: ConversationSummary[];
  isLoading: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: (id: string) => void;
}

export function MessagingSidebar({
  open,
  onToggle,
  conversations,
  isLoading,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}: MessagingSidebarProps) {
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<{
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null>(null);
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    getProfile(user.id).then((p) => {
      if (p) setProfile({ display_name: p.display_name, username: p.username, avatar_url: p.avatar_url });
    });
  }, [user?.id]);

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 flex flex-col border-r border-border bg-sidebar transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-[68px] flex items-center justify-between px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/raspberry-ripple.svg"
              alt="Ripple"
              className="w-9 h-9 rounded-xl object-cover shrink-0"
            />
            <span className="text-base font-semibold tracking-tight text-foreground">
              Ripple
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setShowNewConvo(true)}
              aria-label="New conversation"
            >
              <SquarePen size={17} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onToggle}
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={17} />
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-4">
          {isLoading ? (
            <div className="flex flex-col gap-1.5 px-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-accent animate-pulse"
                  style={{ opacity: 1 - i * 0.15 }}
                />
              ))}
            </div>
          ) : conversations.length > 0 ? (
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={onSelectConversation}
            />
          ) : (
            <div className="px-2 py-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                No conversations yet.{" "}
                <button
                  onClick={() => setShowNewConvo(true)}
                  className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Start one
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer — clickable user info opens profile editor */}
        <div className="h-[72px] px-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 min-w-0 text-left rounded-lg px-1 py-1 hover:bg-muted transition-colors"
            aria-label="Edit profile"
          >
            <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold text-primary">
                  {(profile?.display_name ?? user?.email ?? "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.display_name ?? user?.email}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile ? `@${profile.username}` : "Signed in"}
              </p>
            </div>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => signOut()}
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onToggle}
          aria-hidden
        />
      )}

      {/* Collapsed toggle */}
      {!open && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-5 left-5 z-40 h-10 w-10 rounded-xl bg-card shadow-md"
          onClick={onToggle}
          aria-label="Open sidebar"
        >
          <PanelLeftOpen size={17} />
        </Button>
      )}

      <NewConversationModal
        open={showNewConvo}
        onClose={() => setShowNewConvo(false)}
        onConversationReady={(id) => {
          onNewConversation(id);
          setShowNewConvo(false);
        }}
      />

      <ProfileModal
        open={showProfile}
        onClose={() => setShowProfile(false)}
        onSaved={(updated) => setProfile(updated)}
      />
    </>
  );
}
