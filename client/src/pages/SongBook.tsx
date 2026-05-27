import { useMemo, useState } from "react";
import { useSongs } from "@/hooks/use-songs";
import { Link } from "wouter";
import { ArrowLeft, Music2, Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SongBook() {
  const { data: songs, isLoading } = useSongs("", true);
  const [search, setSearch] = useState("");
  const [openArtists, setOpenArtists] = useState<Set<string>>(new Set());

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
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleArtist = (artist: string) => {
    setOpenArtists(prev => {
      const next = new Set(prev);
      if (next.has(artist)) next.delete(artist);
      else next.add(artist);
      return next;
    });
  };

  const expandAll = () => setOpenArtists(new Set(grouped.map(([a]) => a)));
  const collapseAll = () => setOpenArtists(new Set());

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
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

      <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        {/* Search */}
        <div className="relative max-w-sm mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Find a song or artist..."
            className="pl-9 h-10 bg-white/5 border-white/10 rounded-xl text-sm"
            data-testid="input-songbook-search"
          />
        </div>

        {/* Collapse/expand controls */}
        <div className="flex items-center justify-between text-xs text-muted-foreground/70 px-1">
          <span>{filtered.length} song{filtered.length !== 1 ? "s" : ""}</span>
          <div className="flex gap-2">
            <button onClick={expandAll} className="hover:text-white transition-colors underline underline-offset-2">Expand All</button>
            <span className="text-white/10">|</span>
            <button onClick={collapseAll} className="hover:text-white transition-colors underline underline-offset-2">Collapse All</button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-1.5">
                <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                {[1, 2, 3].map(j => <div key={j} className="h-3.5 bg-white/5 rounded animate-pulse ml-4" />)}
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Music2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No songs found</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {grouped.map(([artist, artistSongs]) => {
              const isOpen = openArtists.has(artist) || search.length > 0;
              return (
                <div key={artist} className="border border-white/5 rounded-lg overflow-hidden bg-white/[0.02]">
                  {/* Artist header — always visible, clickable */}
                  <button
                    onClick={() => toggleArtist(artist)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                      <span className="text-sm font-bold text-white truncate">{artist}</span>
                    </div>
                    <span className="shrink-0 text-[10px] font-mono text-muted-foreground/50 bg-white/5 px-1.5 py-0.5 rounded">{artistSongs.length}</span>
                  </button>

                  {/* Song list — collapsible */}
                  {isOpen && (
                    <div className="border-t border-white/5">
                      {artistSongs.map((song, i) => (
                        <div
                          key={song.id}
                          className={cn(
                            "flex items-baseline gap-2 px-3 py-1.5 group",
                            i % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.03]"
                          )}
                        >
                          <span className="text-[10px] text-muted-foreground/30 font-mono w-5 shrink-0 text-right">{i + 1}.</span>
                          <div className="min-w-0 flex-1 flex items-baseline gap-1.5">
                            <span className="text-[13px] leading-snug text-white/90 group-hover:text-white transition-colors truncate">
                              {song.title}
                            </span>
                            {song.genre && (
                              <span className={cn(
                                "shrink-0 text-[9px] uppercase tracking-wider px-1 py-0.5 rounded font-semibold",
                                "bg-primary/10 text-primary/60 border border-primary/10"
                              )}>{song.genre}</span>
                            )}
                          </div>
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
                  )}
                </div>
              );
            })}
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
