import { useAuth } from "@/hooks/use-auth";
import { useRequests, useUpdateRequestStatus } from "@/hooks/use-requests";
import { useSongs, useDeleteSong } from "@/hooks/use-songs";
import { useSettings, useUpdateSetting } from "@/hooks/use-settings";
import { useGuestMusicians, useUpdateGuestStatus } from "@/hooks/use-guest-musicians";
import { NeonButton } from "@/components/NeonButton";
import { CreateSongDialog } from "@/components/CreateSongDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Music, Clock, Check, X, LogOut, Loader2, PlayCircle, Trash2, Guitar, Settings } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { RequestWithSongs } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function BandDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/api/login");
    }
  }, [user, authLoading, setLocation]);

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black/95 text-white">
      {/* Top Bar */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center font-bold">
              B
            </div>
            <h1 className="font-display font-bold text-xl tracking-tight">Band Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Logged in as {user.firstName || user.email}
            </span>
            <NeonButton variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4" />
            </NeonButton>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="queue" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">
              Live Queue
            </TabsTrigger>
            <TabsTrigger value="songs" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">
              Song Management
            </TabsTrigger>
            <TabsTrigger value="musicians" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">
              Guest Musicians
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg px-6">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-4">
            <QueueView />
          </TabsContent>

          <TabsContent value="songs" className="space-y-4">
            <SongsManager />
          </TabsContent>

          <TabsContent value="musicians" className="space-y-4">
            <GuestMusicianManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SettingsView() {
  const { data: guitarMode } = useSettings("guitar_mode");
  const { data: guitarInstructions } = useSettings("guitar_instructions");
  const { mutate: updateSetting } = useUpdateSetting();
  const { toast } = useToast();
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (guitarInstructions?.value) {
      setInstructions(guitarInstructions.value);
    }
  }, [guitarInstructions]);

  const toggleGuitarMode = () => {
    const newValue = guitarMode?.value === "true" ? "false" : "true";
    updateSetting({ key: "guitar_mode", value: newValue }, {
      onSuccess: () => toast({ title: `Guitar mode ${newValue === "true" ? "enabled" : "disabled"}` })
    });
  };

  const saveInstructions = () => {
    updateSetting({ key: "guitar_instructions", value: instructions }, {
      onSuccess: () => toast({ title: "Instructions updated" })
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="bg-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Guitar className="w-5 h-5 text-primary" />
            Guitar Player Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
            <div>
              <p className="font-bold">Toggle Guitar Mode</p>
              <p className="text-sm text-muted-foreground">Enable guest guitarist signup on the public page</p>
            </div>
            <Switch 
              checked={guitarMode?.value === "true"} 
              onCheckedChange={toggleGuitarMode} 
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Signup Instructions</label>
            <Textarea 
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="Explain how guests can sit in..."
              className="bg-black/40 border-white/10 min-h-[120px]"
            />
            <NeonButton onClick={saveInstructions} size="sm">Save Instructions</NeonButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GuestMusicianManager() {
  const { data: guests, isLoading } = useGuestMusicians();
  const { mutate: updateStatus } = useUpdateGuestStatus();
  const { toast } = useToast();

  const handleStatus = (id: number, status: string) => {
    updateStatus({ id, status }, {
      onSuccess: () => toast({ title: `Signup ${status}` })
    });
  };

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-50" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {guests?.length === 0 ? (
          <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
            <Guitar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-display font-bold">No signups yet</h3>
          </div>
        ) : (
          guests?.map(guest => (
            <Card key={guest.id} className="bg-card border-white/10 overflow-hidden">
              <CardHeader className="bg-white/5 pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-display text-xl">{guest.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{guest.instrument} • {guest.numSongs} songs</p>
                  </div>
                  <Badge variant={guest.status === 'approved' ? 'default' : 'secondary'}>
                    {guest.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {guest.status === 'pending' ? (
                    <>
                      <NeonButton variant="ghost" size="sm" onClick={() => handleStatus(guest.id, 'rejected')}>Reject</NeonButton>
                      <NeonButton size="sm" onClick={() => handleStatus(guest.id, 'approved')}>Approve</NeonButton>
                    </>
                  ) : guest.status === 'approved' ? (
                    <NeonButton className="col-span-2 w-full" size="sm" onClick={() => handleStatus(guest.id, 'completed')}>Complete</NeonButton>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function QueueView() {
  const { data: requests, isLoading } = useRequests();
  const { mutate: updateStatus } = useUpdateRequestStatus();
  const { toast } = useToast();

  const handleStatus = (id: number, status: 'approved' | 'completed' | 'rejected') => {
    updateStatus({ id, status }, {
      onSuccess: () => {
        toast({ title: `Request ${status}` });
      }
    });
  };

  if (isLoading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-50" /></div>;

  const pendingRequests = requests?.filter((r: RequestWithSongs) => r.status === 'pending' || r.status === 'approved') || [];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pendingRequests.length === 0 ? (
        <div className="col-span-full text-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/5">
          <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-display font-bold">No requests yet</h3>
          <p className="text-muted-foreground">Wait for the audience to submit songs!</p>
        </div>
      ) : (
        pendingRequests.map((req: RequestWithSongs) => (
          <Card key={req.id} className={cn(
            "bg-card border-white/10 overflow-hidden transition-all duration-300",
            req.status === 'approved' ? "ring-2 ring-primary shadow-[0_0_20px_-5px_hsl(var(--primary))]" : ""
          )}>
            <CardHeader className="bg-white/5 pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="font-display text-xl">{req.participantName}</CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(req.createdAt), 'h:mm a')}
                  </div>
                </div>
                <Badge variant={req.status === 'approved' ? 'default' : 'secondary'} className="bg-primary/20 text-primary border-primary/20">
                  {req.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                {req.songs.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                    <span className="font-mono text-xs text-muted-foreground w-4">{idx + 1}.</span>
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
                    <NeonButton 
                      variant="ghost" 
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      onClick={() => handleStatus(req.id, 'rejected')}
                    >
                      <X className="w-4 h-4 mr-2" /> Reject
                    </NeonButton>
                    <NeonButton 
                      size="sm"
                      onClick={() => handleStatus(req.id, 'approved')}
                    >
                      <Check className="w-4 h-4 mr-2" /> Approve
                    </NeonButton>
                  </>
                ) : (
                  <NeonButton 
                    className="col-span-2 w-full bg-green-600 hover:bg-green-500 border-green-500/50"
                    size="sm"
                    onClick={() => handleStatus(req.id, 'completed')}
                  >
                    <Check className="w-4 h-4 mr-2" /> Mark Completed
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

function SongsManager() {
  const { data: songs, isLoading } = useSongs();
  const { mutate: deleteSong } = useDeleteSong();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this song?")) {
      deleteSong(id, {
        onSuccess: () => toast({ title: "Song deleted" })
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
        <div>
          <h2 className="text-xl font-display font-bold">Catalog</h2>
          <p className="text-sm text-muted-foreground">{songs?.length || 0} songs available</p>
        </div>
        <CreateSongDialog />
      </div>

      <ScrollArea className="h-[600px] rounded-xl border border-white/10 bg-black/20">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-white/5 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Artist</th>
                <th className="px-6 py-3">Genre</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {songs?.map((song) => (
                <tr key={song.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium">{song.title}</td>
                  <td className="px-6 py-4 text-muted-foreground">{song.artist}</td>
                  <td className="px-6 py-4">
                    {song.genre && (
                      <span className="px-2 py-1 rounded-full bg-white/10 text-xs">
                        {song.genre}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(song.id)}
                      className="text-muted-foreground hover:text-red-400 p-2 hover:bg-white/5 rounded-full transition-all"
                    >
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
