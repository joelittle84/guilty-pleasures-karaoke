import { useMemo, useState } from "react";
import { useSongs } from "@/hooks/use-songs";
import { Link } from "wouter";
import { ArrowLeft, Music2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SongBook() {
  const { data: songs, isLoading } = useSongs("", true);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!songs) return [];
    const q = search.toLowerCase();
    if (!q) return songs;
    return songs.filter(s => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  }, [songs, search]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const song of filtered) {
      const key = song.artist || "Unknown Artist";
      if (!map[key]) map[key] = [];
      map[key].push(song);
    }
    // Sort each artist's songs alphabetically
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.title.localeCompare(b.title));
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-white transition-colors text-sm shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <Music2 className="w-4 h-4 text-primary shrink-0" />
            <span className="font-display font-bold text-base tracking-tight truncate">Song Book</span>
            {songs && <span className="text-xs text-muted-foreground/60 shrink-0">({songs.length})</span>}
          </div>
          <div className="w-12 shrink-0" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <div className="relative max-w-sm mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search song or artist..."
            className="pl-9 h-10 bg-white/5 border-white/10 rounded-xl text-sm"
            data-testid="input-songbook-search"
          />
        </div>

        {/* Pamphlet grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-2 bg-white/[0.02] rounded-xl border border-white/5 p-4">
                <div className="h-5 w-28 bg-white/10 rounded animate-pulse" />
                {[1, 2, 3].map(j => <div key={j} className="h-3.5 bg-white/5 rounded animate-pulse" />)}
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Music2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No songs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 print:grid-cols-2">
            {grouped.map(([artist, artistSongs]) => (
              <div key={artist} className="space-y-0 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                {/* Artist header — bold, high contrast */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-white/5 border-b border-white/10">
                  <span className="text-[13px] font-bold text-white truncate">{artist}</span>
                  <span className="shrink-0 text-[10px] font-mono text-muted-foreground/50 bg-black/30 px-1.5 py-0.5 rounded">{artistSongs.length}</span>
                </div>

                {/* Song rows — visible, readable, alternating contrast */}
                {artistSongs.map((song, i) => (
                  <div
                    key={song.id}
                    className={cn(
                      "flex items-baseline gap-2 px-3 py-1.5 group transition-colors",
                      i % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.04]",
                      "hover:bg-white/[0.07]"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground/30 font-mono w-4 shrink-0 text-right">{i + 1}.</span>
                    <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                      <span className="text-[13px] leading-snug text-white/90 group-hover:text-white transition-colors truncate">
                        {song.title}
                      </span>
                    </div>
                    {song.genre && (
                      <span className={cn(
                        "shrink-0 text-[9px] uppercase tracking-wider px-1 py-0.5 rounded font-semibold",
                        "bg-white/10 text-white/50"
                      )}>
                        {song.genre}
                      </span>
                    )}
                    {song.spotifyUrl && (
                      <a
                        href={song.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="shrink-0 text-[10px] text-green-400/70 hover:text-green-400 transition-colors underline underline-offset-2"
                      >
                        Preview
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="pt-6 pb-4 text-center border-t border-white/10">
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/20 border border-primary/30 text-primary font-semibold hover:bg-primary/30 transition-colors text-sm">
            <Music2 className="w-4 h-4" /> Select Songs & Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
