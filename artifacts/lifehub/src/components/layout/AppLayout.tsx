import { ReactNode, useState, useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import FeedbackModal from "../FeedbackModal";
import SearchModal from "../SearchModal";
import SpotifyMiniPlayer from "./SpotifyMiniPlayer";
import { Search, Handshake } from "lucide-react";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-[100dvh] bg-[var(--surface-0)] text-[var(--text-primary)] overflow-hidden font-sans dark">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex-none px-4 py-3 border-b border-[var(--surface-1)] bg-[var(--surface-0)] z-10">
          <div className="flex items-center justify-end gap-3">
            <SpotifyMiniPlayer />
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--surface-2)] text-[var(--text-subtle)] hover:text-[#C9A84C] hover:border-[#C9A84C]/40 transition-all text-sm shrink-0"
              title="Pesquisar (Ctrl+P)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Ctrl+P</span>
            </button>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--surface-2)] text-[var(--text-subtle)] hover:text-[#C9A84C] hover:border-[#C9A84C]/40 transition-all shrink-0"
              title="Reportar bug / enviar feedback"
            >
              <Handshake className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
