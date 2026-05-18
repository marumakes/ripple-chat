import { useState } from "react";
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
import type { ConversationSummary } from "@/data/conversations";
import { ConversationList } from "./ConversationList";
import { NewConversationModal } from "./NewConversationModal";

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
  const [showModal, setShowModal] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 flex flex-col border-r border-border bg-sidebar transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="2.5" fill="white" />
                <circle
                  cx="7"
                  cy="7"
                  r="5"
                  stroke="white"
                  strokeWidth="1.2"
                  fill="none"
                  opacity="0.6"
                />
              </svg>
            </div>
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
              onClick={() => setShowModal(true)}
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

        {/* Label */}
        <div className="px-5 pt-5 pb-2 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Messages
          </p>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
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
                  onClick={() => setShowModal(true)}
                  className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Start one
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Footer — current user + sign out */}
        <div className="px-4 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email}
            </p>
            <p className="text-xs text-muted-foreground">Signed in</p>
          </div>
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
        open={showModal}
        onClose={() => setShowModal(false)}
        onConversationReady={(id) => {
          onNewConversation(id);
          setShowModal(false);
        }}
      />
    </>
  );
}
