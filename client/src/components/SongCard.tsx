import { Song } from "@shared/schema";
import { Music, Check, Plus } from "lucide-react";
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
            <Music className="w-3 h-3" />
            {song.artist}
          </p>
          
          {song.genre && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/5">
              {song.genre}
            </span>
          )}
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
            {isSelected ? (
              <Check className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
