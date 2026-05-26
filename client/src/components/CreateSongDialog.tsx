import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NeonButton } from "./NeonButton";
import { useCreateSong } from "@/hooks/use-songs";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

export function CreateSongDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: createSong, isPending } = useCreateSong();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    genre: "",
    group: "",
    spotifyUrl: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.artist) return;

    createSong(formData, {
      onSuccess: () => {
        setOpen(false);
        setFormData({ title: "", artist: "", genre: "", group: "", spotifyUrl: "" });
        toast({ title: "Song Added", description: `${formData.title} added to the catalog.` });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

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
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Song Title</Label>
            <Input 
              id="title" 
              required
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Don't Stop Believin'"
              className="bg-black/20 border-white/10 focus:border-primary/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist">Artist</Label>
            <Input 
              id="artist" 
              required
              value={formData.artist}
              onChange={e => setFormData(prev => ({ ...prev, artist: e.target.value }))}
              placeholder="e.g. Journey"
              className="bg-black/20 border-white/10 focus:border-primary/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genre">Genre (Optional)</Label>
              <Input 
                id="genre" 
                value={formData.genre}
                onChange={e => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                placeholder="Rock"
                className="bg-black/20 border-white/10 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group">Group/Label (Optional)</Label>
              <Input 
                id="group" 
                value={formData.group}
                onChange={e => setFormData(prev => ({ ...prev, group: e.target.value }))}
                placeholder="e.g. Disney Duo"
                className="bg-black/20 border-white/10 focus:border-primary/50"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="spotify">Spotify URL (Optional)</Label>
            <Input 
              id="spotify" 
              value={formData.spotifyUrl}
              onChange={e => setFormData(prev => ({ ...prev, spotifyUrl: e.target.value }))}
              placeholder="https://..."
              className="bg-black/20 border-white/10 focus:border-primary/50"
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-2">
            <NeonButton type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</NeonButton>
            <NeonButton type="submit" isLoading={isPending}>Create Song</NeonButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
