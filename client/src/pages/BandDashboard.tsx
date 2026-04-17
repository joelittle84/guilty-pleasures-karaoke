import { useAuth } from "@/hooks/use-auth";
import { useRequests, useUpdateRequestStatus } from "@/hooks/use-requests";
import { useSongs, useDeleteSong, useToggleSong } from "@/hooks/use-songs";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
import { useGuestMusicians, useUpdateGuestStatus, useDeleteGuest, useClearCompletedGuests } from "@/hooks/use-guest-musicians";
import { useActiveTrivia, useCreateTriviaSession, useUpdateTriviaStatus, useAdvanceTriviaQuestion, useDeleteAllTrivia } from "@/hooks/use-trivia";
import { usePreSignups, useDeletePreSignup, useClearPreSignups } from "@/hooks/use-presignup";
import { NeonButton } from "@/components/NeonButton";
import { CreateSongDialog } from "@/components/CreateSongDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Music, Clock, Check, X, LogOut, Loader2, Trash2, Guitar, Eye, EyeOff,
  Settings as SettingsIcon, QrCode, FileUp, DollarSign, Trophy, Play,
  ChevronRight, SkipForward, Users, Sparkles, ListMusic, Upload, CalendarCheck,
  Timer, Hash
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import { RequestWithSongs, TriviaSessionPublic } from "@shared/schema";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import Papa from "papaparse";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

export default function BandDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [user, authLoading]);

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/`;

  return (
    <div className="min-h-screen bg-black/95 text-white">
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center font-bold">B</div>
            <h1 className="font-display font-bold text-xl tracking-tight">Band Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.firstName || user.email}</span>
            <NeonButton variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
            </NeonButton>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl flex-wrap h-auto gap-1">
            <TabsTrigger value="queue" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <ListMusic className="w-4 h-4 mr-1.5" /> Live Queue
            </TabsTrigger>
            <TabsTrigger value="songs" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <Music className="w-4 h-4 mr-1.5" /> Songs
            </TabsTrigger>
            <TabsTrigger value="musicians" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <Guitar className="w-4 h-4 mr-1.5" /> Musicians
            </TabsTrigger>
            <TabsTrigger value="presignup" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <CalendarCheck className="w-4 h-4 mr-1.5" /> Pre-Signup
            </TabsTrigger>
            <TabsTrigger value="trivia" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <Trophy className="w-4 h-4 mr-1.5" /> Trivia
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-4 py-2 text-sm">
              <SettingsIcon className="w-4 h-4 mr-1.5" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue"><QueueView /></TabsContent>
          <TabsContent value="songs"><SongsManager /></TabsContent>
          <TabsContent value="musicians"><GuestMusicianManager /></TabsContent>
          <TabsContent value="presignup"><PreSignupManager /></TabsContent>
          <TabsContent value="trivia"><TriviaManager /></TabsContent>
          <TabsContent value="settings"><SettingsView shareUrl={shareUrl} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsView({ shareUrl }: { shareUrl: string }) {
  const { data: guitarMode } = useSettings("guitar_mode");
  const { data: guitarInstructions } = useSettings("guitar_instructions");
  const { data: businessName } = useSettings("business_name");
  const { data: businessInfo } = useSettings("business_info");
  const { data: logoUrl } = useSettings("logo_url");
  const { data: artworkUrl } = useSettings("hero_artwork_url");
  const { mutate: updateSetting, isPending: isSaving } = useUpdateSetting();
  const { toast } = useToast();

  const [instructions, setInstructions] = useState("");
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  const [logo, setLogo] = useState("");
  const [artwork, setArtwork] = useState("");
  const [venmo, setVenmo] = useState("");
  const [zelle, setZelle] = useState("");
  const [spotifyClientId, setSpotifyClientId] = useState("");
  const [spotifyClientSecret, setSpotifyClientSecret] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => { if (guitarInstructions?.value) setInstructions(guitarInstructions.value); }, [guitarInstructions]);
  useEffect(() => { if (businessName?.value) setName(businessName.value); }, [businessName]);
  useEffect(() => { if (businessInfo?.value) setInfo(businessInfo.value); }, [businessInfo]);
  useEffect(() => { if (logoUrl?.value) setLogo(logoUrl.value); }, [logoUrl]);
  useEffect(() => { if (artworkUrl?.value) setArtwork(artworkUrl.value); }, [artworkUrl]);

  const toggleGuitarMode = () => {
    const newValue = guitarMode?.value === "true" ? "false" : "true";
    updateSetting({ key: "guitar_mode", value: newValue }, {
      onSuccess: () => toast({ title: `Guitar mode ${newValue === "true" ? "enabled" : "disabled"}` })
    });
  };

  const saveBranding = () => {
    updateSetting({ key: "business_name", value: name });
    updateSetting({ key: "business_info", value: info });
    updateSetting({ key: "logo_url", value: logo });
    updateSetting({ key: "hero_artwork_url", value: artwork }, {
      onSuccess: () => toast({ title: "Branding saved" })
    });
  };

  const saveTips = () => {
    if (venmo) updateSetting({ key: "venmo_handle", value: venmo });
    if (zelle) updateSetting({ key: "zelle_handle", value: zelle }, {
      onSuccess: () => toast({ title: "Tip info saved & encrypted" })
    });
  };

  const saveSpotify = () => {
    if (spotifyClientId) updateSetting({ key: "spotify_client_id", value: spotifyClientId });
    if (spotifyClientSecret) updateSetting({ key: "spotify_client_secret", value: spotifyClientSecret }, {
      onSuccess: () => toast({ title: "Spotify credentials saved & encrypted" })
    });
  };

  const importSpotifyPlaylist = async () => {
    if (!playlistUrl.trim()) return;
    setIsImporting(true);
    try {
      const res = await apiRequest("POST", "/api/songs/import-spotify", { playlistUrl });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import failed");
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Spotify Import Complete", description: `Imported ${data.imported} songs from playlist.` });
      setPlaylistUrl("");
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 pb-20">
      <Card className="bg-card border-white/10">
        <CardHeader><CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> Share Your Show</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center p-8 space-y-4">
          <div className="p-4 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]"><QRCodeSVG value={shareUrl} size={200} /></div>
          <p className="text-sm text-muted-foreground">{shareUrl}</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-white/10">
        <CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-primary" /> Project & Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><label className="text-sm font-medium">Business / Project Name</label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Neon Nights Karaoke" className="bg-black/40 border-white/10" /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Tagline / Info</label><Input value={info} onChange={e => setInfo(e.target.value)} placeholder="e.g. The premier live band experience" className="bg-black/40 border-white/10" /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Logo URL</label><Input value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://example.com/logo.png" className="bg-black/40 border-white/10" /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Hero Artwork URL</label><Input value={artwork} onChange={e => setArtwork(e.target.value)} placeholder="https://example.com/hero.jpg" className="bg-black/40 border-white/10" /></div>
          <NeonButton onClick={saveBranding} size="sm" className="mt-2">Save Branding</NeonButton>
        </CardContent>
      </Card>

      <Card className="bg-card border-white/10">
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" /> Tip the Band!</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Your payment handles are stored encrypted. They'll appear on the public page so fans can tip you.</p>
          <div className="space-y-2"><label className="text-sm font-medium">Venmo Username</label><Input value={venmo} onChange={e => setVenmo(e.target.value)} placeholder="@your-venmo" className="bg-black/40 border-white/10" /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Zelle Phone / Email</label><Input value={zelle} onChange={e => setZelle(e.target.value)} placeholder="your@email.com or (555) 000-0000" className="bg-black/40 border-white/10" /></div>
          <NeonButton onClick={saveTips} size="sm" className="bg-green-600 hover:bg-green-500 border-green-500/50">
            <DollarSign className="w-4 h-4 mr-1" /> Save Tip Info
          </NeonButton>
        </CardContent>
      </Card>

      <Card className="bg-card border-white/10">
        <CardHeader><CardTitle className="flex items-center gap-2"><Guitar className="w-5 h-5 text-primary" /> Guitar Player Mode</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div><p className="font-bold">Toggle Guitar Mode</p><p className="text-sm text-muted-foreground">Enable guest guitarist signup on the public page</p></div>
            <Switch checked={guitarMode?.value === "true"} onCheckedChange={toggleGuitarMode} />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">Signup Instructions</label>
            <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Explain how guests can sit in..." className="bg-black/40 border-white/10 min-h-[100px]" />
            <NeonButton onClick={() => updateSetting({ key: "guitar_instructions", value: instructions }, { onSuccess: () => toast({ title: "Instructions updated" }) })} size="sm">Save Instructions</NeonButton>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-400" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
            Spotify Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-white">Setup Required</p>
            <p>Create a Spotify app at <span className="text-primary">developer.spotify.com</span>, then enter your Client ID and Secret below. Credentials are stored encrypted.</p>
          </div>
          <div className="space-y-2"><label className="text-sm font-medium">Client ID</label><Input value={spotifyClientId} onChange={e => setSpotifyClientId(e.target.value)} placeholder="Your Spotify Client ID" className="bg-black/40 border-white/10 font-mono text-sm" /></div>
          <div className="space-y-2"><label className="text-sm font-medium">Client Secret</label><Input type="password" value={spotifyClientSecret} onChange={e => setSpotifyClientSecret(e.target.value)} placeholder="Your Spotify Client Secret" className="bg-black/40 border-white/10 font-mono text-sm" /></div>
          <NeonButton onClick={saveSpotify} size="sm" className="bg-green-600 hover:bg-green-500 border-green-500/50">Save Spotify Credentials</NeonButton>
          <div className="pt-2 border-t border-white/10 space-y-3">
            <label className="text-sm font-medium">Import from Playlist URL</label>
            <div className="flex gap-2">
              <Input value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..." className="bg-black/40 border-white/10 flex-1" />
              <NeonButton size="sm" onClick={importSpotifyPlaylist} isLoading={isImporting}><Upload className="w-4 h-4" /></NeonButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Songs Manager ─────────────────────────────────────────────────────────────
function SongsManager() {
  const { data: songs, isLoading } = useSongs(undefined, false);
  const { mutate: deleteSong } = useDeleteSong();
  const { mutate: toggleSong } = useToggleSong();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState("");

  const handleDelete = (id: number) => {
    if (confirm("Delete this song?")) {
      deleteSong(id, { onSuccess: () => toast({ title: "Song deleted" }) });
    }
  };

  const handleToggle = (id: number) => {
    toggleSong(id, { onSuccess: () => toast({ title: "Visibility updated" }) });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        try {
          let count = 0;
          for (const row of results.data as any[]) {
            if (row.title && row.artist) {
              await apiRequest("POST", "/api/songs", { title: row.title, artist: row.artist, genre: row.genre || "", spotifyUrl: row.spotifyUrl || row.spotify_url || "" });
              count++;
            }
          }
          queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
          toast({ title: "Import Complete", description: `Imported ${count} songs.` });
        } catch {
          toast({ title: "Import Failed", variant: "destructive" });
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: () => { setIsImporting(false); toast({ title: "CSV parse error", variant: "destructive" }); }
    });
  };

  const filtered = songs?.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.artist.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
        <div>
          <h2 className="text-xl font-display font-bold">Song Catalog</h2>
          <p className="text-sm text-muted-foreground">{songs?.length || 0} songs · {songs?.filter(s => s.isActive).length || 0} visible</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <NeonButton variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} isLoading={isImporting}>
            <FileUp className="w-4 h-4 mr-1.5" /> CSV Upload
          </NeonButton>
          <CreateSongDialog />
        </div>
      </div>
      <div className="relative">
        <Input placeholder="Search songs..." value={search} onChange={e => setSearch(e.target.value)} className="bg-white/5 border-white/10 pl-4" />
      </div>
      <ScrollArea className="h-[560px] rounded-xl border border-white/10 bg-black/20">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Artist</th>
                <th className="px-4 py-3 hidden md:table-cell">Genre</th>
                <th className="px-4 py-3 hidden md:table-cell">Spotify</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(song => (
                <tr key={song.id} className={cn("hover:bg-white/5 transition-colors", !song.isActive && "opacity-40")}>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(song.id)} className={cn("p-1 rounded transition-colors", song.isActive ? "text-primary hover:text-primary/70" : "text-muted-foreground hover:text-white")}>
                      {song.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium">{song.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{song.artist}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {song.genre && <span className="px-2 py-1 rounded-full bg-white/10 text-xs">{song.genre}</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {song.spotifyUrl ? (
                      <a href={song.spotifyUrl} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 text-xs underline underline-offset-2">Preview</a>
                    ) : <span className="text-white/20 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(song.id)} className="text-muted-foreground hover:text-red-400 p-2 rounded-full transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Guest Musicians ───────────────────────────────────────────────────────────
function GuestMusicianManager() {
  const { data: guests, isLoading } = useGuestMusicians();
  const { mutate: updateStatus } = useUpdateGuestStatus();
  const { mutate: deleteGuest } = useDeleteGuest();
  const { mutate: clearCompleted, isPending: isClearing } = useClearCompletedGuests();
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const handleStatus = (id: number, status: string) => {
    updateStatus({ id, status }, { onSuccess: () => toast({ title: `Signup ${status}` }) });
  };

  const handleDismiss = (id: number) => {
    setDismissed(prev => new Set([...prev, id]));
    setTimeout(() => { deleteGuest(id); }, 300);
  };

  const handleClearAll = () => {
    clearCompleted(undefined, { onSuccess: () => toast({ title: "Cleared all completed signups" }) });
  };

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-50" /></div>;

  const visibleGuests = guests?.filter(g => !dismissed.has(g.id)) || [];
  const hasCompleted = visibleGuests.some(g => g.status === "completed");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
        <div>
          <h2 className="text-xl font-display font-bold">Guest Musicians</h2>
          <p className="text-sm text-muted-foreground">Sorted by signup time · swipe completed to dismiss</p>
        </div>
        {hasCompleted && (
          <NeonButton variant="outline" size="sm" onClick={handleClearAll} isLoading={isClearing} className="text-red-400 border-red-400/30 hover:bg-red-950/30">
            <Trash2 className="w-4 h-4 mr-1.5" /> Clear Completed
          </NeonButton>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleGuests.length === 0 ? (
          <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
            <Guitar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-display font-bold">No signups yet</h3>
          </div>
        ) : (
          <AnimatePresence>
            {visibleGuests.map(guest => (
              <motion.div
                key={guest.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 200, transition: { duration: 0.25 } }}
                drag={guest.status === "completed" ? "x" : false}
                dragConstraints={{ left: 0, right: 200 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => { if (info.offset.x > 80) handleDismiss(guest.id); }}
                className={cn("cursor-default", guest.status === "completed" && "cursor-grab active:cursor-grabbing")}
              >
                <Card className="bg-card border-white/10 overflow-hidden h-full">
                  <CardHeader className="bg-white/5 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="font-display text-lg">{guest.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{guest.instrument} · {guest.numSongs} songs · {format(new Date(guest.createdAt), 'h:mm a')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={guest.status === 'approved' ? 'default' : guest.status === 'completed' ? 'outline' : 'secondary'} className="text-xs">
                          {guest.status.toUpperCase()}
                        </Badge>
                        {guest.status === "completed" && (
                          <button onClick={() => handleDismiss(guest.id)} className="text-muted-foreground hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3">
                    {guest.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2">
                        <NeonButton variant="ghost" size="sm" onClick={() => handleStatus(guest.id, 'rejected')} className="text-red-400 hover:bg-red-950/30">Reject</NeonButton>
                        <NeonButton size="sm" onClick={() => handleStatus(guest.id, 'approved')}>Approve</NeonButton>
                      </div>
                    )}
                    {guest.status === "approved" && (
                      <NeonButton className="w-full bg-green-600 hover:bg-green-500 border-green-500/50" size="sm" onClick={() => handleStatus(guest.id, 'completed')}>
                        <Check className="w-4 h-4 mr-1.5" /> Mark Complete
                      </NeonButton>
                    )}
                    {guest.status === "completed" && (
                      <p className="text-xs text-muted-foreground text-center py-1">Swipe right or tap × to dismiss</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ─── Pre-Signup Manager ────────────────────────────────────────────────────────
function PreSignupManager() {
  const { data: preSignups, isLoading } = usePreSignups();
  const { mutate: deleteOne, isPending: isDeleting } = useDeletePreSignup();
  const { mutate: clearAll, isPending: isClearing } = useClearPreSignups();
  const { mutate: updateSetting } = useUpdateSetting();
  const { data: presignupEnabled } = useSettings("presignup_enabled");
  const { data: presignupLimit } = useSettings("presignup_limit");
  const { data: presignupWindowStart } = useSettings("presignup_window_start");
  const { data: presignupWindowEnd } = useSettings("presignup_window_end");
  const { toast } = useToast();

  const [limit, setLimit] = useState("50");
  const [windowStart, setWindowStart] = useState("");
  const [windowEnd, setWindowEnd] = useState("");

  useEffect(() => { if (presignupLimit?.value) setLimit(presignupLimit.value); }, [presignupLimit]);
  useEffect(() => {
    if (presignupWindowStart?.value) {
      // Convert ISO to datetime-local format
      const d = new Date(presignupWindowStart.value);
      setWindowStart(d.toISOString().slice(0, 16));
    }
  }, [presignupWindowStart]);
  useEffect(() => {
    if (presignupWindowEnd?.value) {
      const d = new Date(presignupWindowEnd.value);
      setWindowEnd(d.toISOString().slice(0, 16));
    }
  }, [presignupWindowEnd]);

  const isEnabled = presignupEnabled?.value === "true";

  const toggleEnabled = () => {
    const newVal = isEnabled ? "false" : "true";
    updateSetting({ key: "presignup_enabled", value: newVal }, {
      onSuccess: () => toast({ title: `Pre-signup ${newVal === "true" ? "enabled" : "disabled"}` })
    });
  };

  const saveConfig = () => {
    updateSetting({ key: "presignup_limit", value: limit });
    if (windowStart) updateSetting({ key: "presignup_window_start", value: new Date(windowStart).toISOString() });
    if (windowEnd) updateSetting({ key: "presignup_window_end", value: new Date(windowEnd).toISOString() }, {
      onSuccess: () => toast({ title: "Pre-signup settings saved" })
    });
  };

  const handleDelete = (id: number) => {
    deleteOne(id, { onSuccess: () => toast({ title: "Removed pre-signup" }) });
  };

  const handleClearAll = () => {
    if (!confirm(`Delete all ${preSignups?.length || 0} pre-signups?`)) return;
    clearAll(undefined, { onSuccess: () => toast({ title: "All pre-signups cleared" }) });
  };

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-50" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Config card */}
      <Card className="bg-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-blue-400" /> Pre-Signup Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="font-bold">Enable Pre-Signup</p>
              <p className="text-sm text-muted-foreground">Show a "Pre-Register" button on the public page</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={toggleEnabled} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Spot Limit</label>
              <Input type="number" min={1} value={limit} onChange={e => setLimit(e.target.value)} placeholder="50" className="bg-black/40 border-white/10" />
              <p className="text-xs text-muted-foreground">Max number of pre-registrations allowed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Window Opens</label>
              <Input type="datetime-local" value={windowStart} onChange={e => setWindowStart(e.target.value)} className="bg-black/40 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Window Closes</label>
              <Input type="datetime-local" value={windowEnd} onChange={e => setWindowEnd(e.target.value)} className="bg-black/40 border-white/10" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Leave the time window empty to make pre-signup available any time while enabled.</p>

          <NeonButton onClick={saveConfig} size="sm" className="bg-blue-700 hover:bg-blue-600 border-blue-500/50">
            <CalendarCheck className="w-4 h-4 mr-1.5" /> Save Pre-Signup Settings
          </NeonButton>
        </CardContent>
      </Card>

      {/* Signups list */}
      <Card className="bg-card border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" /> Pre-Registered
              <Badge variant="secondary" className="ml-1">{preSignups?.length || 0}</Badge>
            </CardTitle>
            {preSignups && preSignups.length > 0 && (
              <NeonButton variant="outline" size="sm" onClick={handleClearAll} isLoading={isClearing} className="text-red-400 border-red-400/30 hover:bg-red-950/30">
                <Trash2 className="w-4 h-4 mr-1" /> Clear All
              </NeonButton>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!preSignups || preSignups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No pre-signups yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-3">
                {preSignups.map((signup, i) => (
                  <div key={signup.id} className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/5 group">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}.</span>
                      <div>
                        <p className="font-medium">{signup.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {signup.email && <span>{signup.email}</span>}
                          {signup.phone && <span>{signup.phone}</span>}
                          <span>{format(new Date(signup.createdAt), 'MMM d, h:mm a')}</span>
                        </div>
                        {signup.notes && <p className="text-xs text-white/50 mt-0.5 italic">"{signup.notes}"</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(signup.id)}
                      className="text-muted-foreground hover:text-red-400 p-1.5 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Queue View ────────────────────────────────────────────────────────────────
function QueueView() {
  const { data: requests, isLoading } = useRequests();
  const { mutate: updateStatus } = useUpdateRequestStatus();
  const { toast } = useToast();

  const handleStatus = (id: number, status: 'approved' | 'completed' | 'rejected') => {
    updateStatus({ id, status }, { onSuccess: () => toast({ title: `Request ${status}` }) });
  };

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-50" /></div>;

  const active = requests?.filter((r: RequestWithSongs) => r.status === 'pending' || r.status === 'approved') || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {active.length === 0 ? (
        <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
          <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-display font-bold">Queue is empty</h3>
          <p className="text-muted-foreground">Requests will appear here</p>
        </div>
      ) : (
        active.map((req: RequestWithSongs, idx: number) => (
          <Card key={req.id} className={cn("bg-card border-white/10 overflow-hidden transition-all duration-300", req.status === 'approved' ? "ring-2 ring-primary shadow-[0_0_20px_-5px_hsl(var(--primary))]" : "")}>
            <CardHeader className="bg-white/5 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                    <CardTitle className="font-display text-xl">{req.participantName}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />{format(new Date(req.createdAt), 'h:mm a')}
                  </div>
                </div>
                <Badge variant={req.status === 'approved' ? 'default' : 'secondary'} className="bg-primary/20 text-primary border-primary/20">
                  {req.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                {req.songs.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="font-mono text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-sm">{item.song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.song.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {req.status === 'pending' ? (
                  <>
                    <NeonButton variant="ghost" size="sm" className="text-red-400 hover:bg-red-950/30" onClick={() => handleStatus(req.id, 'rejected')}>
                      <X className="w-4 h-4 mr-1" /> Reject
                    </NeonButton>
                    <NeonButton size="sm" onClick={() => handleStatus(req.id, 'approved')}>
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </NeonButton>
                  </>
                ) : (
                  <NeonButton className="col-span-2 bg-green-600 hover:bg-green-500 border-green-500/50" size="sm" onClick={() => handleStatus(req.id, 'completed')}>
                    <Check className="w-4 h-4 mr-1.5" /> Mark Completed
                  </NeonButton>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Trivia Manager ────────────────────────────────────────────────────────────
function TriviaManager() {
  const { data: activeSession, isLoading } = useActiveTrivia();
  const { mutate: createSession, isPending: isCreating } = useCreateTriviaSession();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateTriviaStatus();
  const { mutate: advanceQuestion, isPending: isAdvancing } = useAdvanceTriviaQuestion();
  const { mutate: deleteAll, isPending: isDeleting } = useDeleteAllTrivia();
  const { toast } = useToast();
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState("");
  const [questionCount, setQuestionCount] = useState(4);
  const [questionDuration, setQuestionDuration] = useState(25);
  const { data: requests } = useRequests();
  const [serverCountdown, setServerCountdown] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local countdown to server's secondsRemaining
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (activeSession?.status === "active" && activeSession.secondsRemaining !== null && activeSession.secondsRemaining !== undefined) {
      setServerCountdown(Math.ceil(activeSession.secondsRemaining));
      countdownRef.current = setInterval(() => {
        setServerCountdown(prev => {
          if (prev === null || prev <= 0) { clearInterval(countdownRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      setServerCountdown(null);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [activeSession?.currentQuestionIndex, activeSession?.secondsRemaining, activeSession?.status]);

  const handleCreate = () => {
    if (!songTitle || !songArtist) {
      toast({ title: "Enter song title and artist", variant: "destructive" });
      return;
    }
    createSession({ songTitle, songArtist, questionCount, questionDurationSeconds: questionDuration }, {
      onSuccess: () => {
        toast({ title: "Trivia session created!", description: `${questionCount} questions · ${questionDuration}s per question. Auto-advances on timer.` });
        setSongTitle(""); setSongArtist("");
      },
      onError: () => toast({ title: "Failed to create trivia", variant: "destructive" })
    });
  };

  const handleStart = () => {
    if (!activeSession) return;
    updateStatus({ id: activeSession.id, status: "active" }, {
      onSuccess: () => toast({ title: "Trivia started! Questions auto-advance every " + activeSession.questionDurationSeconds + " seconds." })
    });
  };

  const handleNext = () => {
    if (!activeSession) return;
    advanceQuestion(activeSession.id, {
      onSuccess: (session: any) => {
        if (session.status === "completed") {
          toast({ title: "Trivia complete! Check the leaderboard." });
        } else {
          toast({ title: `Skipped to question ${session.currentQuestionIndex + 1}` });
        }
      }
    });
  };

  const pendingRequests = requests?.filter((r: RequestWithSongs) => r.status === 'pending' || r.status === 'approved') || [];

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-50" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Create New Session */}
      {!activeSession && (
        <Card className="bg-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-400" /> Launch Song Trivia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-sm text-blue-200/80 flex items-start gap-2.5">
              <Timer className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
              <p>Questions <strong>auto-advance on a timer</strong> — just hit Start and you're free to perform. Players see a live countdown.</p>
            </div>

            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Quick fill from queue:</label>
                <div className="flex flex-wrap gap-2">
                  {pendingRequests.slice(0, 4).map((r: RequestWithSongs) => r.songs.slice(0, 1).map(item => (
                    <button
                      key={`${r.id}-${item.song.id}`}
                      onClick={() => { setSongTitle(item.song.title); setSongArtist(item.song.artist); }}
                      className="px-3 py-1.5 text-xs bg-primary/10 border border-primary/20 text-primary rounded-full hover:bg-primary/20 transition-colors"
                    >
                      {item.song.title} — {item.song.artist}
                    </button>
                  )))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Song Title</label>
                <Input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="e.g. Bohemian Rhapsody" className="bg-black/40 border-white/10" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Artist</label>
                <Input value={songArtist} onChange={e => setSongArtist(e.target.value)} placeholder="e.g. Queen" className="bg-black/40 border-white/10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-muted-foreground" /> Questions (3–5)</label>
                <Input type="number" min={3} max={5} value={questionCount} onChange={e => setQuestionCount(parseInt(e.target.value))} className="bg-black/40 border-white/10" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1.5"><Timer className="w-3.5 h-3.5 text-muted-foreground" /> Seconds per Question</label>
                <Input type="number" min={10} max={60} value={questionDuration} onChange={e => setQuestionDuration(parseInt(e.target.value))} className="bg-black/40 border-white/10" />
              </div>
            </div>
            <NeonButton onClick={handleCreate} isLoading={isCreating} className="w-full">
              <Sparkles className="w-4 h-4 mr-2" /> Generate Trivia Questions
            </NeonButton>
          </CardContent>
        </Card>
      )}

      {/* Active Session Control */}
      {activeSession && (
        <Card className={cn("bg-card border-white/10", activeSession.status === "active" && "ring-2 ring-yellow-400/50 shadow-[0_0_30px_-5px_rgba(250,204,21,0.3)]")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                {activeSession.songTitle}
                <span className="text-muted-foreground font-normal text-base">— {activeSession.songArtist}</span>
              </CardTitle>
              <Badge variant={activeSession.status === "active" ? "default" : activeSession.status === "completed" ? "outline" : "secondary"} className={cn(activeSession.status === "active" && "bg-yellow-500/20 text-yellow-300 border-yellow-500/30 animate-pulse")}>
                {activeSession.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <Users className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xl font-bold">{activeSession.participantCount}</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <ListMusic className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xl font-bold">{activeSession.currentQuestionIndex + (activeSession.status === "active" ? 1 : 0)}/{activeSession.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Question</p>
              </div>
              <div className={cn("rounded-xl p-3 text-center transition-colors", serverCountdown !== null && serverCountdown <= 5 ? "bg-red-500/20" : "bg-white/5")}>
                <Timer className={cn("w-4 h-4 mx-auto mb-1", serverCountdown !== null && serverCountdown <= 5 ? "text-red-400" : "text-muted-foreground")} />
                <p className={cn("text-xl font-bold", serverCountdown !== null && serverCountdown <= 5 && "text-red-300")}>
                  {serverCountdown !== null ? `${serverCountdown}s` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>

            {/* Auto-timer note */}
            {activeSession.status === "active" && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-200/80 flex items-center gap-2">
                <Timer className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                Auto-advancing every {activeSession.questionDurationSeconds}s — you don't need to do anything. Use "Skip" only if needed.
              </div>
            )}

            {/* Current question preview */}
            {activeSession.status === "active" && activeSession.currentQuestion && (
              <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-yellow-300">Current Question:</p>
                  {serverCountdown !== null && (
                    <div className="w-24 bg-white/10 rounded-full h-1.5">
                      <div
                        className={cn("h-1.5 rounded-full transition-all duration-1000", serverCountdown <= 5 ? "bg-red-400" : "bg-yellow-400")}
                        style={{ width: `${(serverCountdown / activeSession.questionDurationSeconds) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                <p className="font-bold">{activeSession.currentQuestion.question}</p>
                <div className="grid grid-cols-2 gap-2">
                  {activeSession.currentQuestion.options.map((opt, i) => (
                    <div key={i} className={cn("text-xs px-3 py-2 rounded-lg border", i === activeSession.currentQuestion!.correctIndex ? "bg-green-500/20 border-green-500/40 text-green-300" : "bg-white/5 border-white/10")}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            {activeSession.leaderboard.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Leaderboard</p>
                {activeSession.leaderboard.slice(0, 5).map((p, i) => (
                  <div key={p.playerName} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground w-4">#{i + 1}</span>
                      <span className="font-medium">{p.playerName}</span>
                    </div>
                    <span className="text-primary font-bold">{p.score} pts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
              {activeSession.status === "waiting" && (
                <NeonButton onClick={handleStart} isLoading={isUpdating} className="flex-1">
                  <Play className="w-4 h-4 mr-2" /> Start Trivia!
                </NeonButton>
              )}
              {activeSession.status === "active" && (
                <NeonButton onClick={handleNext} isLoading={isAdvancing} variant="outline" size="sm" className="text-yellow-300 border-yellow-500/30 hover:bg-yellow-950/30">
                  <SkipForward className="w-4 h-4 mr-1.5" />
                  {activeSession.currentQuestionIndex + 1 >= activeSession.totalQuestions ? "End Now" : "Skip Question"}
                </NeonButton>
              )}
              <NeonButton variant="ghost" size="sm" onClick={() => deleteAll(undefined, { onSuccess: () => toast({ title: "Trivia session cleared" }) })} isLoading={isDeleting} className="text-red-400 hover:bg-red-950/30">
                <Trash2 className="w-4 h-4 mr-1" /> Clear
              </NeonButton>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
