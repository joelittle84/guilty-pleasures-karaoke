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
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Music2 className="w-4 h-4 text-primary" />
            <span className="font-display font-bold text-lg tracking-tight">Song Book</span>
            {songs && <span className="text-xs text-muted-foreground">({songs.length} songs)</span>}
          </div>
          <div className="w-16" />
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

        {/* Intro note */}
        <div className="text-center text-xs text-muted-foreground/60 italic">
          Browse our full catalog · Go back to pick songs and sign up
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                {[1, 2, 3].map(j => <div key={j} className="h-4 bg-white/5 rounded animate-pulse" />)}
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Music2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No songs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6 print:grid-cols-2">
            {grouped.map(([artist, artistSongs]) => (
              <div key={artist} className="space-y-1">
                {/* Artist header */}
                <div className="flex items-center gap-2 pb-1 border-b border-primary/30">
                  <span className="text-sm font-bold text-primary truncate">{artist}</span>
                  <span className="shrink-0 text-xs text-muted-foreground/60">({artistSongs.length})</span>
                </div>
                {/* Song rows */}
                {artistSongs.map((song, i) => (
                  <div key={song.id} className="flex items-baseline gap-2 py-0.5 group">
                    <span className="text-[10px] text-muted-foreground/40 font-mono w-4 shrink-0 text-right">{i + 1}</span>
                    <div className="min-w-0">
                      <span className="text-sm leading-tight text-white/90 group-hover:text-white transition-colors">{song.title}</span>
                      {song.genre && (
                        <span className={cn(
                          "ml-1.5 text-[9px] uppercase tracking-wider px-1 py-0.5 rounded font-semibold",
                          "bg-white/10 text-white/40"
                        )}>{song.genre}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="pt-8 pb-4 text-center border-t border-white/10">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/20 border border-primary/30 text-primary font-semibold hover:bg-primary/30 transition-colors text-sm">
            <Music2 className="w-4 h-4" /> Select Songs & Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
