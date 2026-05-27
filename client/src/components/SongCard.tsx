import { Song } from "@shared/schema";
import { Music, Check, Plus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SongCardProps {
  song: Song;
  isSelected?: boolean;
  onToggle?: (song: Song) => void;
  readOnly?: boolean;
}

export function SongCard({ song, isSelected, onToggle, readOnly = false }: SongCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
        isSelected
          ? "bg-primary/10 border-primary shadow-[0_0_15px_-5px_hsl(var(--primary))]"
          : "bg-card/50 border-white/5 hover:border-white/10 hover:bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-display text-lg font-bold truncate pr-2",
            isSelected ? "text-primary" : "text-white group-hover:text-primary transition-colors"
          )}>
            {song.title}
          </h3>
          <p className="text-muted-foreground text-sm font-medium truncate flex items-center gap-2">
            <Music className="w-3 h-3 flex-shrink-0" />
            {song.artist}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {song.genre && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/5">
                {song.genre}
              </span>
            )}
            {song.spotifyUrl && (
              <a
                href={song.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Preview
              </a>
            )}
          </div>
        </div>

        {!readOnly && (
          <button
            onClick={() => onToggle?.(song)}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
              isSelected
                ? "bg-primary text-white shadow-[0_0_10px_hsl(var(--primary))]"
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
            )}
          >
            {isSelected ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </button>
        )}
      </div>
    </motion.div>
  );
}
