import { useState } from "react";
import { useSongs } from "@/hooks/use-songs";
import { useCreateRequest } from "@/hooks/use-requests";
import { useSettings } from "@/hooks/use-settings";
import { useCreateGuestMusician } from "@/hooks/use-guest-musicians";
import { SongCard } from "@/components/SongCard";
import { NeonButton } from "@/components/NeonButton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Mic2, Music2, X, ListMusic, User, CheckCircle2, Guitar, QrCode } from "lucide-react";
import { Song } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showGuestSignup, setShowGuestSignup] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [numSongs, setNumSongs] = useState(2);

  const { data: songs, isLoading } = useSongs(search);
  const { mutate: submitRequest, isPending: isSubmitting } = useCreateRequest();
  const { data: guitarMode } = useSettings("guitar_mode");
  const { data: guitarInstructions } = useSettings("guitar_instructions");
  const { data: businessName } = useSettings("business_name");
  const { data: businessInfo } = useSettings("business_info");
  const { data: logoUrl } = useSettings("logo_url");
  const { data: artworkUrl } = useSettings("hero_artwork_url");
  
  const { mutate: signupGuest, isPending: isSigningUp } = useCreateGuestMusician();
  const { toast } = useToast();

  const handleToggleSong = (song: Song) => {
    if (selectedSongs.find(s => s.id === song.id)) {
      setSelectedSongs(prev => prev.filter(s => s.id !== song.id));
    } else {
      if (selectedSongs.length >= 3) {
        toast({
          title: "Limit Reached",
          description: "You can only select up to 3 songs.",
          variant: "destructive"
        });
        return;
      }
      setSelectedSongs(prev => [...prev, song]);
    }
  };

  const handleSubmit = () => {
    if (!participantName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name so the band can call you up!",
        variant: "destructive"
      });
      return;
    }

    submitRequest({
      participantName,
      songIds: selectedSongs.map(s => s.id)
    }, {
      onSuccess: () => {
        setShowConfirm(false);
        setShowSuccess(true);
        setSelectedSongs([]);
        setParticipantName("");
      },
      onError: (err) => {
        toast({
          title: "Submission Failed",
          description: err.message || "Could not submit request. Try again.",
          variant: "destructive"
        });
      }
    });
  };

  const handleGuestSignup = () => {
    if (!guestName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name.",
        variant: "destructive"
      });
      return;
    }

    signupGuest({
      name: guestName,
      instrument: "Guitar",
      numSongs,
    }, {
      onSuccess: () => {
        setShowGuestSignup(false);
        setGuestName("");
        toast({
          title: "Signup Successful",
          description: "The band will let you know when it's your turn to sit in!",
        });
      }
    });
  };

  const shareUrl = `${window.location.origin}/`;

  return (
    <div className="min-h-screen pb-32">
      {/* Hero Header */}
      <header className="relative pt-12 pb-8 px-4 overflow-hidden min-h-[300px] flex flex-col justify-center">
        {artworkUrl?.value ? (
          <div className="absolute top-0 left-0 w-full h-full z-0">
            <img src={artworkUrl.value} className="w-full h-full object-cover opacity-30" alt="Hero Artwork" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
          </div>
        ) : (
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        )}
        
        <div className="max-w-md mx-auto text-center relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {logoUrl?.value && (
              <img src={logoUrl.value} className="h-20 mx-auto mb-6 drop-shadow-xl" alt="Logo" />
            )}
            <h1 className="text-4xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/70 mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {businessName?.value || "LIVE BAND"}
              <span className="block text-primary text-glow mt-1">{businessName?.value ? "" : "KARAOKE"}</span>
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              {businessInfo?.value || "You're the star. We're the band."}
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {guitarMode?.value === "true" && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <NeonButton 
                  onClick={() => setShowGuestSignup(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-primary/30 bg-primary/5 text-primary"
                >
                  <Guitar className="w-4 h-4 mr-2" />
                  Guest Guitarist
                </NeonButton>
              </motion.div>
            )}

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <NeonButton 
                onClick={() => setShowQR(true)}
                variant="outline"
                size="sm"
                className="rounded-full border-white/20 bg-white/5 text-white/70"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Share Show
              </NeonButton>
            </motion.div>
          </div>
          
          <div className="mt-8 relative max-w-sm mx-auto">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
              <Search className="w-5 h-5" />
            </div>
            <Input 
              placeholder="Search artist or song..." 
              className="pl-10 h-14 bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl text-lg focus:border-primary/50 focus:ring-primary/20 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Guest Signup Dialog */}
      <Dialog open={showGuestSignup} onOpenChange={setShowGuestSignup}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Guitar className="w-5 h-5 text-primary" />
              Guest Guitarist Signup
            </DialogTitle>
            <DialogDescription className="pt-2 text-white/70">
              {guitarInstructions?.value || "Signup to sit in with the band for a few songs!"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input 
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Enter your name..."
                className="bg-black/40 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Songs (2-4)</label>
              <Input 
                type="number"
                min={2}
                max={4}
                value={numSongs}
                onChange={e => setNumSongs(parseInt(e.target.value))}
                className="bg-black/40 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <NeonButton 
              className="w-full" 
              onClick={handleGuestSignup}
              isLoading={isSigningUp}
            >
              Sign Up to Sit In
            </NeonButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-card border-white/10 text-center sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Share This Show</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              Let others scan this code to request their favorite songs!
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="p-4 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <QRCodeSVG value={shareUrl} size={200} />
            </div>
            <p className="text-xs text-muted-foreground break-all px-4">{shareUrl}</p>
          </div>
          <div className="pt-2">
            <NeonButton onClick={() => setShowQR(false)} variant="outline" className="w-full">
              Close
            </NeonButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Song List */}
      <main className="px-4 max-w-md mx-auto space-y-4">
        {isLoading ? (
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : songs && songs.length > 0 ? (
          <div className="space-y-3 pb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
              <span>{songs.length} songs found</span>
              <span className="text-primary/80 font-medium">
                {selectedSongs.length}/3 selected
              </span>
            </div>
            {songs.map(song => (
              <SongCard
                key={song.id}
                song={song}
                isSelected={selectedSongs.some(s => s.id === song.id)}
                onToggle={handleToggleSong}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Music2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No songs found matching "{search}"</p>
          </div>
        )}
      </main>

      {/* Floating Action Bar */}
      <AnimatePresence>
        {selectedSongs.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-40"
          >
            <div className="max-w-md mx-auto">
              <NeonButton 
                onClick={() => setShowConfirm(true)}
                size="lg" 
                className="w-full shadow-2xl shadow-primary/20"
              >
                <ListMusic className="w-5 h-5 mr-2" />
                Review Requests ({selectedSongs.length})
              </NeonButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission Modal */}
      <Sheet open={showConfirm} onOpenChange={setShowConfirm}>
        <SheetContent side="bottom" className="rounded-t-[2rem] border-t border-white/10 bg-[#121214] max-h-[90vh]">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-2xl text-center">Your Setlist</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-6">
            <div className="space-y-3">
              {selectedSongs.map((song, i) => (
                <div key={song.id} className="flex items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mr-3">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground">{song.artist}</p>
                  </div>
                  <button 
                    onClick={() => handleToggleSong(song)}
                    className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <label className="text-sm font-medium text-muted-foreground ml-1">Your Stage Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                <Input
                  value={participantName}
                  onChange={e => setParticipantName(e.target.value)}
                  placeholder="Enter your name..."
                  className="pl-10 h-12 bg-black/40 border-white/10"
                />
              </div>
            </div>

            <NeonButton 
              className="w-full mt-4" 
              size="lg"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              <Mic2 className="w-5 h-5 mr-2" />
              Submit to Band
            </NeonButton>
          </div>
        </SheetContent>
      </Sheet>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-card border-white/10 text-center sm:max-w-sm">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4 text-green-500">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">You're on the list!</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
              The band has received your requests. Watch the screens or listen for your name!
            </DialogDescription>
          </DialogHeader>
          <div className="pt-6">
            <NeonButton onClick={() => setShowSuccess(false)} variant="outline" className="w-full">
              Close
            </NeonButton>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Footer Login Link */}
      <div className="fixed bottom-4 right-4 z-0 opacity-50 hover:opacity-100 transition-opacity">
        <Link href="/band" className="text-xs text-muted-foreground hover:text-white flex items-center gap-1">
          Musician Login
        </Link>
      </div>
    </div>
  );
}
