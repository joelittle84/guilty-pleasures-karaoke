import { useState, useEffect, useRef, useMemo } from "react";
import { useSongs } from "@/hooks/use-songs";
import { useCreateRequest } from "@/hooks/use-requests";
import { useSettings } from "@/hooks/use-settings";
import { useCreateGuestMusician } from "@/hooks/use-guest-musicians";
import { useActiveTrivia, useJoinTrivia, useSubmitTriviaAnswer } from "@/hooks/use-trivia";
import { useQueueInfo } from "@/hooks/use-queue-info";
import { usePreSignupConfig, useCreatePreSignup } from "@/hooks/use-presignup";
import { SongCard } from "@/components/SongCard";
import { NeonButton } from "@/components/NeonButton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Mic2, Music2, X, ListMusic, User, CheckCircle2, Check, Guitar, QrCode, DollarSign, Clock, Trophy, Sparkles, Users, CalendarCheck, BookOpen } from "lucide-react";
import { Song, TriviaSessionPublic } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [search, setSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [participantName, setParticipantName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedQueuePosition, setSubmittedQueuePosition] = useState(0);
  const [showGuestSignup, setShowGuestSignup] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showSignupsClosed, setShowSignupsClosed] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [numSongs, setNumSongs] = useState(2);
  const [tipHandles, setTipHandles] = useState<{ venmo: string | null; zelle: string | null }>({ venmo: null, zelle: null });

  // Trivia state
  const [showTrivia, setShowTrivia] = useState(false);
  const [triviaPlayerName, setTriviaPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; score: number } | null>(null);
  const [lastSeenQuestionIndex, setLastSeenQuestionIndex] = useState(-1);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Pre-signup state
  const [showPreSignup, setShowPreSignup] = useState(false);
  const [preSignupName, setPreSignupName] = useState("");
  const [preSignupEmail, setPreSignupEmail] = useState("");
  const [preSignupPhone, setPreSignupPhone] = useState("");
  const [preSignupDone, setPreSignupDone] = useState(false);
  const [preSignupSongs, setPreSignupSongs] = useState<Song[]>([]);
  const [preSignupSearch, setPreSignupSearch] = useState("");

  const { data: allSongs, isLoading } = useSongs("", true);

  const artists = useMemo(() => {
    if (!allSongs) return [];
    const set = new Set(allSongs.map(s => s.artist).filter(Boolean));
    return Array.from(set).sort();
  }, [allSongs]);

  const genres = useMemo(() => {
    if (!allSongs) return [];
    const set = new Set(allSongs.map(s => s.genre).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [allSongs]);

  const songs = useMemo(() => {
    if (!allSongs) return [];
    const q = search.toLowerCase();
    return allSongs.filter(s => {
      const matchSearch = !q || s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
      const matchArtist = artistFilter === "all" || s.artist === artistFilter;
      const matchGenre = genreFilter === "all" || s.genre === genreFilter;
      return matchSearch && matchArtist && matchGenre;
    });
  }, [allSongs, search, artistFilter, genreFilter]);
  const { mutate: submitRequest, isPending: isSubmitting } = useCreateRequest();
  const { data: guitarMode } = useSettings("guitar_mode");
  const { data: guitarInstructions } = useSettings("guitar_instructions");
  const { data: businessName } = useSettings("business_name");
  const { data: businessInfo } = useSettings("business_info");
  const { data: logoUrl } = useSettings("logo_url");
  const { data: logoSize } = useSettings("logo_size");
  const { data: logoSpacing } = useSettings("logo_spacing");
  const { data: artworkUrl } = useSettings("hero_artwork_url");
  const { data: signupsEnabledSetting } = useSettings("signups_enabled");
  const signupsOpen = signupsEnabledSetting?.value !== "false";
  const { mutate: signupGuest, isPending: isSigningUp } = useCreateGuestMusician();
  const { data: queueInfo } = useQueueInfo();
  const { data: activeTrivia } = useActiveTrivia();
  const { mutate: joinTrivia, isPending: isJoining } = useJoinTrivia();
  const { mutate: submitAnswer, isPending: isSubmittingAnswer } = useSubmitTriviaAnswer();
  const { data: preSignupConfig } = usePreSignupConfig();
  const { mutate: createPreSignup, isPending: isPreSigningUp } = useCreatePreSignup();
  const { data: bookingEnabled } = useSettings("booking_enabled");
  const { data: bookingTitle } = useSettings("booking_title");
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/tips").then(r => r.json()).then(setTipHandles).catch(() => {});
  }, []);

  // Reset answer state when question advances
  useEffect(() => {
    if (!activeTrivia) return;
    if (activeTrivia.currentQuestionIndex !== lastSeenQuestionIndex && activeTrivia.status === "active") {
      setSelectedAnswer(null);
      setAnswerResult(null);
      setLastSeenQuestionIndex(activeTrivia.currentQuestionIndex);
    }
  }, [activeTrivia?.currentQuestionIndex, activeTrivia?.status, lastSeenQuestionIndex]);

  // Countdown timer synced to server's secondsRemaining
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (activeTrivia?.status === "active" && activeTrivia.secondsRemaining !== null && activeTrivia.secondsRemaining !== undefined) {
      setCountdown(Math.ceil(activeTrivia.secondsRemaining));
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 0) { clearInterval(countdownRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(null);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [activeTrivia?.currentQuestionIndex, activeTrivia?.secondsRemaining, activeTrivia?.status]);

  const hasTips = tipHandles.venmo || tipHandles.zelle;
  const shareUrl = `${window.location.origin}/`;

  const handleToggleSong = (song: Song) => {
    if (selectedSongs.find(s => s.id === song.id)) {
      setSelectedSongs(prev => prev.filter(s => s.id !== song.id));
    } else {
      if (selectedSongs.length >= 3) {
        toast({ title: "Limit Reached", description: "You can only select up to 3 songs.", variant: "destructive" });
        return;
      }
      setSelectedSongs(prev => [...prev, song]);
    }
  };

  const handleSubmit = () => {
    if (!participantName.trim()) {
      toast({ title: "Name Required", description: "Please enter your name so the band can call you up!", variant: "destructive" });
      return;
    }
    const positionBeforeSubmit = queueInfo?.queueLength ?? 0;
    submitRequest({ participantName, songIds: selectedSongs.map(s => s.id), isPresignup: false }, {
      onSuccess: () => {
        setSubmittedQueuePosition(positionBeforeSubmit);
        setShowConfirm(false);
        setShowSuccess(true);
        setSelectedSongs([]);
        setParticipantName("");
      },
      onError: (err) => {
        toast({ title: "Submission Failed", description: err.message || "Could not submit request. Try again.", variant: "destructive" });
      }
    });
  };

  const handleGuestSignup = () => {
    if (!guestName.trim()) {
      toast({ title: "Name Required", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    signupGuest({ name: guestName, instrument: "Guitar", numSongs }, {
      onSuccess: () => {
        setShowGuestSignup(false);
        setGuestName("");
        toast({ title: "Signup Successful!", description: "The band will let you know when it's your turn!" });
      }
    });
  };

  const handleJoinTrivia = () => {
    if (!triviaPlayerName.trim() || !activeTrivia) return;
    joinTrivia({ sessionId: activeTrivia.id, playerName: triviaPlayerName }, {
      onSuccess: () => {
        setHasJoined(true);
        toast({ title: "You're in!", description: "Get ready to play!" });
      }
    });
  };

  const handleAnswer = (answerIndex: number) => {
    if (!activeTrivia || selectedAnswer !== null || !hasJoined) return;
    setSelectedAnswer(answerIndex);
    submitAnswer({ sessionId: activeTrivia.id, playerName: triviaPlayerName, answerIndex }, {
      onSuccess: (result) => setAnswerResult(result)
    });
  };

  const handlePreSignup = () => {
    if (!preSignupName.trim()) {
      toast({ title: "Name Required", variant: "destructive" });
      return;
    }
    const payload: any = { name: preSignupName, email: preSignupEmail || undefined, phone: preSignupPhone || undefined };
    if (preSignupSongs.length > 0) payload.songIds = preSignupSongs.map(s => s.id);
    createPreSignup(payload, {
      onSuccess: () => setPreSignupDone(true),
      onError: (err: any) => toast({ title: "Registration Failed", description: err.message, variant: "destructive" })
    });
  };

  const togglePreSignupSong = (song: Song) => {
    setPreSignupSongs(prev => {
      const already = prev.find(s => s.id === song.id);
      if (already) return prev.filter(s => s.id !== song.id);
      if (prev.length >= 3) { toast({ title: "Max 3 songs", variant: "destructive" }); return prev; }
      return [...prev, song];
    });
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Hero */}
      <header className="relative pt-12 pb-8 px-4 overflow-hidden min-h-[300px] flex flex-col justify-center">
        {/* Booking button — top left */}
        {bookingEnabled?.value === "true" && (
          <div className="absolute top-3 left-3 z-20">
            <Link href="/booking">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white text-xs font-semibold transition-all backdrop-blur-sm" data-testid="button-booking-inquiry">
                <BookOpen className="w-3.5 h-3.5" />
                {bookingTitle?.value || "Book Us"}
              </button>
            </Link>
          </div>
        )}

        {artworkUrl?.value ? (
          <div className="absolute top-0 left-0 w-full h-full z-0">
            <img src={artworkUrl.value} className="w-full h-full object-cover opacity-30" alt="Hero" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black" />
          </div>
        ) : (
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        )}

        <div className="max-w-md mx-auto text-center relative z-10">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            {(() => {
              if (logoUrl?.value) {
                const s = logoSize?.value || "medium";
                const sp = logoSpacing?.value || "medium";
                const spacingMap: Record<string, string> = { none: "mb-0", small: "mb-1", medium: "mb-4", large: "mb-8" };
                const spClass = spacingMap[sp] || "mb-4";
                let logoClass = `h-24 md:h-32 mx-auto ${spClass} drop-shadow-xl`;
                if (s === "small") logoClass = `h-16 md:h-20 mx-auto ${spClass} drop-shadow-xl`;
                else if (s === "large") logoClass = `h-32 md:h-48 mx-auto ${spClass} drop-shadow-xl`;
                else if (s === "full") logoClass = `w-full max-w-md mx-auto ${spClass} drop-shadow-xl`;
                return <img src={logoUrl.value} className={logoClass} alt="Logo" />;
              }
              if (businessName?.value) {
                const words = businessName.value.trim().split(/\s+/);
                const line1 = words.slice(0, 2).join(" ");
                const line2 = words.slice(2).join(" ");
                return (
                  <h1 className="text-4xl md:text-5xl font-display font-black mb-2 leading-tight">
                    <span className="block text-white text-glow-multicolor">{line1}</span>
                    {line2 && <span className="block text-primary text-glow mt-1">{line2}</span>}
                  </h1>
                );
              }
              return (
                <h1 className="text-4xl md:text-5xl font-display font-black mb-2">
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/70 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">LIVE BAND</span>
                  <span className="block text-primary text-glow mt-1">KARAOKE</span>
                </h1>
              );
            })()}
            <p className="text-muted-foreground font-medium text-lg">
              {businessInfo?.value || "You're the star. We're the band."}
            </p>
          </motion.div>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {preSignupConfig?.isOpen && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
                <NeonButton onClick={() => setShowPreSignup(true)} variant="outline" size="sm" className="rounded-full border-blue-500/30 bg-blue-500/10 text-blue-300">
                  <CalendarCheck className="w-4 h-4 mr-2" /> Pre-Register
                  {preSignupConfig.spotsRemaining <= 10 && (
                    <span className="ml-1 text-xs font-bold text-orange-300">({preSignupConfig.spotsRemaining} left!)</span>
                  )}
                </NeonButton>
              </motion.div>
            )}
            {guitarMode?.value === "true" && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                <NeonButton onClick={() => setShowGuestSignup(true)} variant="outline" size="sm" className="rounded-full border-primary/30 bg-primary/5 text-primary">
                  <Guitar className="w-4 h-4 mr-2" /> Guest Guitarist
                </NeonButton>
              </motion.div>
            )}
            {hasTips && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
                <NeonButton onClick={() => setShowTips(true)} variant="outline" size="sm" className="rounded-full border-green-500/30 bg-green-500/5 text-green-400">
                  <DollarSign className="w-4 h-4 mr-2" /> Tip the Band!
                </NeonButton>
              </motion.div>
            )}
            {activeTrivia && (activeTrivia.status === "waiting" || activeTrivia.status === "active") && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                <NeonButton onClick={() => setShowTrivia(true)} variant="outline" size="sm" className="rounded-full border-yellow-500/30 bg-yellow-500/10 text-yellow-300 animate-pulse">
                  <Trophy className="w-4 h-4 mr-2" /> Play Trivia!
                </NeonButton>
              </motion.div>
            )}
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
              <NeonButton onClick={() => setShowQR(true)} variant="outline" size="sm" className="rounded-full border-white/20 bg-white/5 text-white/70">
                <QrCode className="w-4 h-4 mr-2" /> Share
              </NeonButton>
            </motion.div>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
              <Link href="/songbook" className="rounded-full border border-white/20 bg-white/5 text-white/70 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium hover:bg-white/10 hover:text-white transition-colors">
                <BookOpen className="w-4 h-4" /> Song Book
              </Link>
            </motion.div>
          </div>

          {/* Wait time info */}
          {queueInfo && queueInfo.queueLength > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>{queueInfo.queueLength} in queue · est. <strong className="text-white">{queueInfo.estimatedMinutes} min</strong> wait</span>
              </div>
            </motion.div>
          )}

          <div className="mt-6 max-w-sm mx-auto space-y-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                <Search className="w-5 h-5" />
              </div>
              <Input
                placeholder="Search artist or song..."
                className="pl-10 h-14 bg-white/5 border-white/10 backdrop-blur-xl rounded-2xl text-lg focus:border-primary/50 transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
                data-testid="input-song-search"
              />
            </div>
            {(artists.length > 0 || genres.length > 0) && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={artistFilter}
                  onChange={e => setArtistFilter(e.target.value)}
                  data-testid="select-artist-filter"
                  className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 appearance-none cursor-pointer focus:outline-none focus:border-primary/50"
                >
                  <option value="all">All Artists</option>
                  {artists.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select
                  value={genreFilter}
                  onChange={e => setGenreFilter(e.target.value)}
                  data-testid="select-genre-filter"
                  className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 appearance-none cursor-pointer focus:outline-none focus:border-primary/50"
                >
                  <option value="all">All Genres</option>
                  {genres.map(g => <option key={g} value={g!}>{g}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Song List */}
      <main className="px-4 max-w-md mx-auto space-y-4">
        {isLoading ? (
          <div className="space-y-4 pt-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}</div>
        ) : songs && songs.length > 0 ? (
          <div className="space-y-3 pb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
              <span>{songs.length} songs</span>
              <span className="text-primary/80 font-medium">{selectedSongs.length}/3 selected</span>
            </div>
            {songs.map(song => (
              <SongCard key={song.id} song={song} isSelected={selectedSongs.some(s => s.id === song.id)} onToggle={handleToggleSong} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Music2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No songs found{search || artistFilter !== "all" || genreFilter !== "all" ? " — try clearing filters" : ""}</p>
            {(search || artistFilter !== "all" || genreFilter !== "all") && (
              <button onClick={() => { setSearch(""); setArtistFilter("all"); setGenreFilter("all"); }} className="mt-2 text-sm text-primary underline underline-offset-4">Clear filters</button>
            )}
          </div>
        )}
      </main>

      {/* Signups closed dialog */}
      <Dialog open={showSignupsClosed} onOpenChange={setShowSignupsClosed}>
        <DialogContent className="bg-card border-yellow-500/30 sm:max-w-sm">
          <DialogHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2 text-yellow-400">
              <Clock className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-display">Signups Not Yet Open</DialogTitle>
            <DialogDescription className="text-yellow-200/70">
              Karaoke event signups will be activated at the time of the event. Check back to see if pre-signups are available.
            </DialogDescription>
          </DialogHeader>
          <NeonButton onClick={() => setShowSignupsClosed(false)} variant="outline" className="w-full">Got it</NeonButton>
        </DialogContent>
      </Dialog>

      {/* Floating action bar */}
      <AnimatePresence>
        {selectedSongs.length > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
            <div className="max-w-md mx-auto">
              <NeonButton onClick={() => signupsOpen ? setShowConfirm(true) : setShowSignupsClosed(true)} size="lg" className="w-full shadow-2xl shadow-primary/20">
                <ListMusic className="w-5 h-5 mr-2" /> {signupsOpen ? `Confirm Song (${selectedSongs.length})` : "Signups Not Open"}
              </NeonButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pre-Signup Dialog */}
      <Dialog open={showPreSignup} onOpenChange={(open) => { setShowPreSignup(open); if (!open) { setPreSignupDone(false); setPreSignupName(""); setPreSignupEmail(""); setPreSignupPhone(""); setPreSignupSongs([]); setPreSignupSearch(""); } }}>
        <DialogContent className="bg-card border-white/10 sm:max-w-md max-h-[90vh] overflow-y-auto">
          {preSignupDone ? (
            <>
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400 mt-4">
                <CalendarCheck className="w-8 h-8" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-center">You're Pre-Registered!</DialogTitle>
                <DialogDescription className="text-center pt-1">We've got your spot saved, {preSignupName}. See you at the show!</DialogDescription>
              </DialogHeader>
              <NeonButton onClick={() => { setShowPreSignup(false); setPreSignupDone(false); }} variant="outline" className="w-full mt-4">Close</NeonButton>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-blue-300"><CalendarCheck className="w-5 h-5" /> Pre-Register for the Show</DialogTitle>
                <DialogDescription className="pt-1">
                  Reserve your spot early.
                  {preSignupConfig && (
                    <span className="block mt-1 text-sm font-medium text-white/80">{preSignupConfig.spotsRemaining} of {preSignupConfig.limit} spots remaining</span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Your Name <span className="text-red-400">*</span></label>
                  <Input value={preSignupName} onChange={e => setPreSignupName(e.target.value)} placeholder="Enter your name..." className="bg-black/40 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Email <span className="text-xs">(optional)</span></label>
                  <Input type="email" value={preSignupEmail} onChange={e => setPreSignupEmail(e.target.value)} placeholder="your@email.com" className="bg-black/40 border-white/10" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Phone <span className="text-xs">(optional)</span></label>
                  <Input type="tel" value={preSignupPhone} onChange={e => setPreSignupPhone(e.target.value)} placeholder="(555) 000-0000" className="bg-black/40 border-white/10" />
                </div>

                {/* Song selection */}
                <div className="space-y-2 pt-1">
                  <label className="text-sm font-medium">Pick Songs <span className="text-xs text-muted-foreground">(optional, up to 3)</span></label>
                  {preSignupSongs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {preSignupSongs.map(s => (
                        <span key={s.id} className="flex items-center gap-1 bg-blue-500/20 text-blue-200 text-xs px-2 py-1 rounded-full border border-blue-500/30">
                          {s.title}
                          <button onClick={() => togglePreSignupSong(s)} className="ml-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <Input value={preSignupSearch} onChange={e => setPreSignupSearch(e.target.value)} placeholder="Search songs..." className="bg-black/40 border-white/10 text-sm" />
                  {preSignupSearch.trim() && (
                    <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-white/10 bg-black/30 p-1">
                      {(allSongs || []).filter(s => s.title.toLowerCase().includes(preSignupSearch.toLowerCase()) || s.artist.toLowerCase().includes(preSignupSearch.toLowerCase())).slice(0, 20).map(s => {
                        const picked = !!preSignupSongs.find(ps => ps.id === s.id);
                        return (
                          <button key={s.id} onClick={() => togglePreSignupSong(s)} className={cn("w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between gap-2", picked ? "bg-blue-600/30 text-blue-200" : "hover:bg-white/10")}>
                            <span><span className="font-medium">{s.title}</span> <span className="text-muted-foreground">— {s.artist}</span></span>
                            {picked && <Check className="w-3 h-3 text-blue-400 shrink-0" />}
                          </button>
                        );
                      })}
                      {(allSongs || []).filter(s => s.title.toLowerCase().includes(preSignupSearch.toLowerCase()) || s.artist.toLowerCase().includes(preSignupSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">No songs found</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <NeonButton className="w-full bg-blue-700 hover:bg-blue-600 border-blue-500/50" onClick={handlePreSignup} isLoading={isPreSigningUp}>
                  <CalendarCheck className="w-4 h-4 mr-2" /> Save My Spot
                </NeonButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Guest Signup */}
      <Dialog open={showGuestSignup} onOpenChange={setShowGuestSignup}>
        <DialogContent className="bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Guitar className="w-5 h-5 text-primary" /> Guest Guitarist Signup</DialogTitle>
            <DialogDescription className="pt-2 text-white/70">{guitarInstructions?.value || "Signup to sit in with the band!"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Enter your name..." className="bg-black/40 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Number of Songs (2–4)</label>
              <Input type="number" min={2} max={4} value={numSongs} onChange={e => setNumSongs(parseInt(e.target.value))} className="bg-black/40 border-white/10" />
            </div>
          </div>
          <DialogFooter>
            <NeonButton className="w-full" onClick={handleGuestSignup} isLoading={isSigningUp}>Sign Up to Sit In</NeonButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tip Dialog */}
      <Dialog open={showTips} onOpenChange={setShowTips}>
        <DialogContent className="bg-card border-white/10 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-400"><DollarSign className="w-6 h-6" /> Tip the Band!</DialogTitle>
            <DialogDescription className="pt-1">If you're loving the show, send the band some love!</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {tipHandles.venmo && (
              <a href={`https://venmo.com/${tipHandles.venmo.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 bg-[#3D95CE]/10 border border-[#3D95CE]/30 rounded-xl p-4 hover:bg-[#3D95CE]/20 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-[#3D95CE] flex items-center justify-center text-white font-bold text-xl">V</div>
                <div><p className="font-bold text-[#3D95CE]">Venmo</p><p className="text-white font-medium">{tipHandles.venmo}</p></div>
              </a>
            )}
            {tipHandles.zelle && (
              <div className="flex items-center gap-4 bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-xl">Z</div>
                <div><p className="font-bold text-purple-400">Zelle</p><p className="text-white font-medium">{tipHandles.zelle}</p></div>
              </div>
            )}
          </div>
          <NeonButton onClick={() => setShowTips(false)} variant="outline" className="w-full">Close</NeonButton>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="bg-card border-white/10 text-center sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Share This Show</DialogTitle>
            <DialogDescription>Let others scan to request songs!</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="p-4 bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <QRCodeSVG value={shareUrl} size={200} />
            </div>
            <p className="text-xs text-muted-foreground break-all">{shareUrl}</p>
          </div>
          <NeonButton onClick={() => setShowQR(false)} variant="outline" className="w-full">Close</NeonButton>
        </DialogContent>
      </Dialog>

      {/* Trivia Dialog */}
      <Dialog open={showTrivia} onOpenChange={setShowTrivia}>
        <DialogContent className="bg-card border-white/10 sm:max-w-md">
          {!activeTrivia ? null : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-yellow-300">
                  <Trophy className="w-5 h-5" /> Music Trivia
                </DialogTitle>
                <DialogDescription className="text-white/70">
                  Song: <strong className="text-white">{activeTrivia.songTitle}</strong> by {activeTrivia.songArtist}
                </DialogDescription>
              </DialogHeader>

              {!hasJoined ? (
                <div className="space-y-4 py-2">
                  {activeTrivia.status === "waiting" ? (
                    <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 text-center">
                      <Sparkles className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                      <p className="font-bold text-yellow-200">Trivia is about to start!</p>
                      <p className="text-sm text-muted-foreground mt-1">Enter your name and get ready to play.</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3 text-center text-sm text-yellow-200">
                      Question {activeTrivia.currentQuestionIndex + 1} of {activeTrivia.totalQuestions} in progress
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your Name</label>
                    <Input value={triviaPlayerName} onChange={e => setTriviaPlayerName(e.target.value)} placeholder="Enter your name to join..." className="bg-black/40 border-white/10" onKeyDown={e => e.key === "Enter" && handleJoinTrivia()} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" /> {activeTrivia.participantCount} players already in
                  </div>
                  <NeonButton className="w-full bg-yellow-600 hover:bg-yellow-500 border-yellow-500/50" onClick={handleJoinTrivia} isLoading={isJoining}>
                    <Trophy className="w-4 h-4 mr-2" /> Join Trivia!
                  </NeonButton>
                </div>
              ) : activeTrivia.status === "waiting" ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-yellow-400/20 flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                  </div>
                  <p className="font-bold text-lg">You're in, {triviaPlayerName}!</p>
                  <p className="text-muted-foreground text-sm">Trivia will start automatically soon...</p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" /> {activeTrivia.participantCount} players ready
                  </div>
                </div>
              ) : activeTrivia.status === "active" && activeTrivia.currentQuestion ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Question {activeTrivia.currentQuestionIndex + 1} of {activeTrivia.totalQuestions}</span>
                    {countdown !== null && (
                      <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold transition-colors",
                        countdown <= 5 ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-yellow-400/10 text-yellow-300 border border-yellow-400/20"
                      )}>
                        <Clock className="w-3.5 h-3.5" />
                        {countdown}s
                      </div>
                    )}
                    <span className="text-yellow-300 font-medium text-xs">{triviaPlayerName}</span>
                  </div>

                  {/* Countdown progress bar */}
                  {countdown !== null && activeTrivia.questionDurationSeconds && (
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className={cn("h-1.5 rounded-full transition-all duration-1000", countdown <= 5 ? "bg-red-400" : "bg-yellow-400")}
                        style={{ width: `${(countdown / activeTrivia.questionDurationSeconds) * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="bg-yellow-400/5 border border-yellow-400/20 rounded-xl p-4">
                    <p className="font-bold text-base leading-snug">{activeTrivia.currentQuestion.question}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {activeTrivia.currentQuestion.options.map((opt, i) => (
                      <button
                        key={i}
                        disabled={selectedAnswer !== null || isSubmittingAnswer || countdown === 0}
                        onClick={() => handleAnswer(i)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                          selectedAnswer === null && countdown !== 0 && "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
                          selectedAnswer !== null && i === activeTrivia.currentQuestion!.correctIndex && "bg-green-500/20 border-green-500/50 text-green-300",
                          selectedAnswer === i && i !== activeTrivia.currentQuestion!.correctIndex && "bg-red-500/20 border-red-500/50 text-red-300",
                          selectedAnswer !== null && i !== selectedAnswer && i !== activeTrivia.currentQuestion!.correctIndex && "opacity-50 bg-white/5 border-white/10",
                          countdown === 0 && selectedAnswer === null && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <span className="font-mono text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {answerResult && (
                    <div className={cn("text-center py-2 px-4 rounded-xl text-sm font-medium", answerResult.correct ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300")}>
                      {answerResult.correct ? "✓ Correct! +1 point" : "✗ Wrong answer"} · Score: {answerResult.score}
                    </div>
                  )}
                  {countdown === 0 && selectedAnswer === null && (
                    <div className="text-center py-2 text-sm text-muted-foreground">⏰ Time's up! Next question coming...</div>
                  )}
                </div>
              ) : activeTrivia.status === "completed" ? (
                <div className="space-y-4 py-2">
                  <div className="text-center">
                    <Trophy className="w-12 h-12 text-yellow-300 mx-auto mb-2" />
                    <p className="font-bold text-xl">Trivia Complete!</p>
                  </div>
                  <div className="space-y-2">
                    {activeTrivia.leaderboard.slice(0, 5).map((p, i) => (
                      <div key={p.playerName} className={cn("flex items-center justify-between px-4 py-2.5 rounded-xl", p.playerName === triviaPlayerName ? "bg-yellow-400/10 border border-yellow-400/30" : "bg-white/5")}>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-mono font-bold", i === 0 ? "text-yellow-300" : "text-muted-foreground")}>#{i + 1}</span>
                          <span className={cn("font-medium", p.playerName === triviaPlayerName && "text-yellow-200")}>{p.playerName}</span>
                        </div>
                        <span className="font-bold text-primary">{p.score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Submission Sheet */}
      <Sheet open={showConfirm} onOpenChange={setShowConfirm}>
        <SheetContent side="bottom" className="rounded-t-[2rem] border-t border-white/10 bg-[#121214] max-h-[90vh]">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-2xl text-center">Your Setlist</SheetTitle>
          </SheetHeader>
          <div className="space-y-6">
            <div className="space-y-3">
              {selectedSongs.map((song, i) => (
                <div key={song.id} className="flex items-center bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mr-3">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground">{song.artist}</p>
                  </div>
                  <button onClick={() => handleToggleSong(song)} className="p-2 text-muted-foreground hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {queueInfo && queueInfo.queueLength > 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-xl border border-white/10 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{queueInfo.queueLength} people ahead · est. <strong className="text-white">{queueInfo.estimatedMinutes} min</strong> until your turn</span>
              </div>
            )}
            <div className="pt-5 border-t border-white/10 space-y-3">
              <div className="text-center space-y-1">
                <p className="text-xs uppercase tracking-widest text-primary/60 font-semibold">Almost there!</p>
                <h3 className="text-2xl font-display font-bold bg-gradient-to-r from-purple-400 via-primary to-green-400 bg-clip-text text-transparent">
                  What's Your Stage Name?
                </h3>
                <p className="text-sm text-muted-foreground">The band will call you up by this name 🎤</p>
              </div>
              <div className="relative">
                <Mic2 className="absolute left-3 top-3.5 w-5 h-5 text-primary/70" />
                <Input
                  value={participantName}
                  onChange={e => setParticipantName(e.target.value)}
                  placeholder="Enter your name..."
                  className="pl-10 h-14 bg-black/40 border-primary/30 text-lg font-medium focus:border-primary/70 transition-all"
                  data-testid="input-participant-name"
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>
            <NeonButton className="w-full mt-2" size="lg" onClick={handleSubmit} isLoading={isSubmitting}>
              <Mic2 className="w-5 h-5 mr-2" /> Submit to Band
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
            <DialogDescription className="text-muted-foreground pt-2">Your request is in. Listen for your name!</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            {submittedQueuePosition > 0 && (
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl border border-white/10 text-sm text-muted-foreground">
                <Users className="w-4 h-4 text-primary shrink-0" />
                <span><strong className="text-white">{submittedQueuePosition}</strong> singer{submittedQueuePosition !== 1 ? "s" : ""} signed up before you</span>
              </div>
            )}
            {submittedQueuePosition > 0 && (
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl border border-white/10 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <span>Estimated wait: <strong className="text-white">{submittedQueuePosition * 4} min</strong></span>
              </div>
            )}
            {submittedQueuePosition === 0 && (
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 rounded-xl border border-green-500/20 text-sm text-green-300">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>You're first in line — get ready!</span>
              </div>
            )}
          </div>
          <div className="pt-4">
            <NeonButton onClick={() => setShowSuccess(false)} variant="outline" className="w-full">Close</NeonButton>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
