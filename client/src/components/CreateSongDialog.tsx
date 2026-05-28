import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NeonButton } from "./NeonButton";
import { useCreateSong, useUpdateSong } from "@/hooks/use-songs";
import { type Song } from "@shared/schema";
import { useState, useEffect } from "react";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SongDialogProps {
  song?: Song;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

function SongDialogContent({ song, onOpenChange }: { song?: Song; onOpenChange?: (open: boolean) => void }) {
  const { mutate: createSong, isPending: isCreating } = useCreateSong();
  const { mutate: updateSong, isPending: isUpdating } = useUpdateSong();
  const { toast } = useToast();
  const isEdit = !!song;

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    genre: "",
    group: "",
    spotifyUrl: "",
    isDuet: false,
  });

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title,
        artist: song.artist,
        genre: song.genre || "",
        group: song.group || "",
        spotifyUrl: song.spotifyUrl || "",
        isDuet: song.isDuet || false,
      });
    }
  }, [song]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.artist) return;

    if (isEdit && song) {
      updateSong({ id: song.id, data: formData }, {
        onSuccess: () => {
          onOpenChange?.(false);
          toast({ title: "Song Updated", description: `${formData.title} has been updated.` });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    } else {
      createSong(formData, {
        onSuccess: () => {
          onOpenChange?.(false);
          setFormData({ title: "", artist: "", genre: "", group: "", spotifyUrl: "", isDuet: false });
          toast({ title: "Song Added", description: `${formData.title} added to the catalog.` });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-title" : "title"}>Song Title</Label>
        <Input
          id={isEdit ? "edit-title" : "title"}
          required
          value={formData.title}
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="e.g. Don't Stop Believin'"
          className="bg-black/20 border-white/10 focus:border-primary/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-artist" : "artist"}>Artist</Label>
        <Input
          id={isEdit ? "edit-artist" : "artist"}
          required
          value={formData.artist}
          onChange={e => setFormData(prev => ({ ...prev, artist: e.target.value }))}
          placeholder="e.g. Journey"
          className="bg-black/20 border-white/10 focus:border-primary/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-genre" : "genre"}>Genre (Optional)</Label>
          <Input
            id={isEdit ? "edit-genre" : "genre"}
            value={formData.genre}
            onChange={e => setFormData(prev => ({ ...prev, genre: e.target.value }))}
            placeholder="Rock"
            className="bg-black/20 border-white/10 focus:border-primary/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={isEdit ? "edit-group" : "group"}>Group/Label (Optional)</Label>
          <Input
            id={isEdit ? "edit-group" : "group"}
            value={formData.group}
            onChange={e => setFormData(prev => ({ ...prev, group: e.target.value }))}
            placeholder="e.g. Disney Duo"
            className="bg-black/20 border-white/10 focus:border-primary/50"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={isEdit ? "edit-spotify" : "spotify"}>Spotify URL (Optional)</Label>
        <Input
          id={isEdit ? "edit-spotify" : "spotify"}
          value={formData.spotifyUrl}
          onChange={e => setFormData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
          placeholder="https://..."
          className="bg-black/20 border-white/10 focus:border-primary/50"
        />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <input
          id={isEdit ? "edit-isDuet" : "isDuet"}
          type="checkbox"
          checked={formData.isDuet}
          onChange={e => setFormData(prev => ({ ...prev, isDuet: e.target.checked }))}
          className="w-4 h-4 accent-primary cursor-pointer"
        />
        <Label htmlFor={isEdit ? "edit-isDuet" : "isDuet"} className="text-sm cursor-pointer">
          This is a Duet
        </Label>
      </div>

      <div className="pt-4 flex justify-end gap-2">
        <NeonButton type="button" variant="ghost" onClick={() => onOpenChange?.(false)}>Cancel</NeonButton>
        <NeonButton type="submit" isLoading={isCreating || isUpdating}>
          {isEdit ? "Save Changes" : "Create Song"}
        </NeonButton>
      </div>
    </form>
  );
}

export function CreateSongDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <NeonButton size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Song
        </NeonButton>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add New Song</DialogTitle>
        </DialogHeader>
        <SongDialogContent onOpenChange={setOpen} />
      </DialogContent>
    </Dialog>
  );
}

export function EditSongDialog({ song, children, onOpenChange }: SongDialogProps) {
  const [open, setOpen] = useState(false);
  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    onOpenChange?.(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <button className="text-muted-foreground hover:text-primary p-2 rounded-full transition-all">
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit Song</DialogTitle>
        </DialogHeader>
        <SongDialogContent song={song} onOpenChange={handleOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
