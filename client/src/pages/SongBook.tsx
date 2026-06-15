import { useMemo, useState } from "react";
import { useSongs } from "@/hooks/use-songs";
import { Link } from "wouter";
import { ArrowLeft, Music2, Search, BookOpen, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SongBook() {
  const { data: songs, isLoading } = useSongs("", true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "book">("book");

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
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => setViewMode("book")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "book" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
              )}
              title="Book view"
              data-testid="button-view-book"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
              )}
              title="List view"
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
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

        {/* Book view — dense pamphlet grid, 2 cols even on mobile */}
        {viewMode === "book" && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="space-y-2 bg-white/[0.02] rounded-xl border border-white/5 p-3">
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                    {[1, 2, 3].map(j => <div key={j} className="h-3 bg-white/5 rounded animate-pulse" />)}
                  </div>
                ))}
              </div>
            ) : grouped.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Music2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No songs found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-3 print:grid-cols-2">
                {grouped.map(([artist, artistSongs]) => (
                  <div key={artist} className="space-y-0 rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
                    {/* Artist header — compact for mobile */}
                    <div className="flex items-center gap-1.5 px-2.5 py-2 bg-white/5 border-b border-white/10">
                      <span className="text-[11px] font-bold text-white truncate">{artist}</span>
                      <span className="shrink-0 text-[9px] font-mono text-muted-foreground/50 bg-black/30 px-1 py-0 rounded">{artistSongs.length}</span>
                    </div>
                    {/* Song rows — compact, readable */}
                    {artistSongs.map((song, i) => (
                      <div
                        key={song.id}
                        className={cn(
                          "flex items-baseline gap-1.5 px-2 py-1 group transition-colors",
                          i % 2 === 0 ? "bg-white/[0.01]" : "bg-white/[0.04]",
                          "hover:bg-white/[0.07]"
                        )}
                      >
                        <span className="text-[9px] text-muted-foreground/30 font-mono w-3 shrink-0 text-right">{i + 1}.</span>
                        <div className="min-w-0 flex-1 flex items-baseline gap-1">
                          <span className="text-[11px] leading-snug text-white/90 group-hover:text-white transition-colors truncate">
                            {song.title}
                          </span>
                          {song.isSolo && (
                            <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider px-0.5 py-0 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">S</span>
                          )}
                          {song.isDuet && (
                            <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider px-0.5 py-0 rounded bg-pink-500/15 text-pink-400 border border-pink-500/30">D</span>
                          )}
                        </div>
                        {song.spotifyUrl && (
                          <a
                            href={song.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="shrink-0 text-[9px] text-green-400/70 hover:text-green-400 transition-colors underline underline-offset-2"
                          >
                            ▶
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* List view — clean single column, easy to scroll */}
        {viewMode === "list" && (
          <>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex gap-3 bg-white/[0.02] rounded-xl border border-white/5 p-3">
                    <div className="h-10 w-10 bg-white/10 rounded animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-32 bg-white/10 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : grouped.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Music2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No songs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {grouped.map(([artist, artistSongs]) => (
                  <div key={artist} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-2.5 bg-white/5 border-b border-white/10">
                      <span className="text-sm font-bold text-white">{artist}</span>
                      <span className="ml-2 text-xs text-muted-foreground/50">{artistSongs.length} songs</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {artistSongs.map((song, i) => (
                        <div key={song.id} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-white/[0.03] transition-colors">
                          <span className="text-xs text-muted-foreground/40 font-mono w-5">{i + 1}.</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">{song.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {song.isSolo && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-1 py-0 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">Solo</span>
                              )}
                              {song.isDuet && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-1 py-0 rounded bg-pink-500/15 text-pink-400 border border-pink-500/30">Duet</span>
                              )}
                              {song.genre && (
                                <span className="text-[10px] text-muted-foreground/50">{song.genre}</span>
                              )}
                            </div>
                          </div>
                          {song.spotifyUrl && (
                            <a
                              href={song.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-xs text-green-400/70 hover:text-green-400 transition-colors underline underline-offset-2"
                            >
                              Preview
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
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
