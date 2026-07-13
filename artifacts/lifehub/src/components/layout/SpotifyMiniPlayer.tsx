import { useState } from "react";
import { Music, SkipBack, SkipForward, Pause, Volume2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SpotifyMiniPlayer() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-1)] border border-[var(--surface-2)] text-[var(--text-subtle)] hover:text-[#1DB954] hover:border-[#1DB954]/40 transition-all text-sm shrink-0"
          title="Spotify"
        >
          <Music className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] w-72 p-4" align="end">
        <div className="flex items-center gap-2 mb-3 text-[#1DB954]">
          <Music className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Spotify</span>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Conecte sua conta do Spotify para ouvir playlists de produtividade direto daqui.
        </p>
        <div className="flex items-center justify-center gap-3 opacity-30 pointer-events-none mb-3">
          <SkipBack className="h-4 w-4" />
          <Pause className="h-5 w-5" />
          <SkipForward className="h-4 w-4" />
          <Volume2 className="h-4 w-4 ml-2" />
        </div>
        <p className="text-xs text-[var(--text-subtle)]">
          Requer configurar um Client ID do Spotify Developer Dashboard. Ainda não conectado.
        </p>
      </PopoverContent>
    </Popover>
  );
}
