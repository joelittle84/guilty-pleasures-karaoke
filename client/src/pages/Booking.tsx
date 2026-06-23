import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { NeonButton } from "@/components/NeonButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import ProseContent from "@/components/ProseContent";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Mail, Phone, Calendar, MapPin, Music2, Play, CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

interface BookingPage {
  enabled: boolean;
  title: string;
  bio: string;
  photos: string[];
  videos: { url: string; title: string }[];
  genres: string;
  performanceInfo: string;
  email: string;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.slice(1);
    } else if (u.hostname.includes("youtube.com")) {
      id = u.searchParams.get("v") || "";
    }
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export default function Booking() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", eventDate: "", venue: "", eventType: "", message: "",
  });

  const { data: bookingPhotoDisplay } = useSettings("booking_photo_display");
  const displayMode = bookingPhotoDisplay?.value || "carousel";

  const { data: page, isLoading } = useQuery<BookingPage>({
    queryKey: ["/api/booking/page"],
  });

  const { mutate: submitInquiry, isPending } = useMutation({
    mutationFn: () => apiRequest("POST", "/api/booking/inquiries", form),
    onSuccess: () => setSubmitted(true),
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to send", variant: "destructive" }),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Please fill in your name and email", variant: "destructive" });
      return;
    }
    submitInquiry();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!page?.enabled) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <Music2 className="w-16 h-16 text-primary/50 mb-4" />
        <h1 className="text-2xl font-display font-bold text-white mb-2">Booking Unavailable</h1>
        <p className="text-muted-foreground mb-6">Booking inquiries are not currently being accepted.</p>
        <Link href="/"><NeonButton variant="outline">Back to Home</NeonButton></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/">
            <button className="text-muted-foreground hover:text-white transition-colors p-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="font-display font-bold text-lg">{page.title || "Book Us"}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10 relative">
        {/* Scroll to top */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-4 right-4 z-50 p-3 bg-white/10 border border-white/10 rounded-full shadow-lg hover:bg-white/20 transition-colors md:hidden"
          aria-label="Scroll to top"
        >
          <ArrowLeft className="w-5 h-5 rotate-90" />
        </button>

        {/* Bio */}
        {page.bio && page.bio !== "<p></p>" && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <ProseContent html={page.bio} />
          </motion.section>
        )}

        {/* Genres / Performance Info */}
        {(page.genres || page.performanceInfo) && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid sm:grid-cols-2 gap-4">
            {page.genres && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Genres / Style</p>
                <p className="text-white/90">{page.genres}</p>
              </div>
            )}
            {page.performanceInfo && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Performance Info</p>
                <p className="text-white/90">{page.performanceInfo}</p>
              </div>
            )}
          </motion.section>
        )}

        {/* Photos */}
        {page.photos.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            {displayMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {page.photos.map((photo, i) => (
                  <button key={i} onClick={() => { setActivePhoto(i); setShowLightbox(true); }} className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                    <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className={`relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 ${displayMode === "portrait" ? "aspect-[3/4]" : "aspect-video"}`}>
                  <img src={page.photos[activePhoto]} alt={`Photo ${activePhoto + 1}`} className="w-full h-full object-cover" />
                  {page.photos.length > 1 && (
                    <>
                      <button onClick={() => setActivePhoto(i => (i - 1 + page.photos.length) % page.photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                      <button onClick={() => setActivePhoto(i => (i + 1) % page.photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 rounded-full p-2 transition-colors rotate-180"><ArrowLeft className="w-4 h-4" /></button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {page.photos.map((_, i) => (
                          <button key={i} onClick={() => setActivePhoto(i)} className={`w-2 h-2 rounded-full transition-all ${i === activePhoto ? "bg-white" : "bg-white/40"}`} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {page.photos.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {page.photos.map((photo, i) => (
                      <button key={i} onClick={() => setActivePhoto(i)} className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${i === activePhoto ? "border-primary" : "border-white/10 opacity-60"}`}>
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.section>
        )}

        {/* YouTube Videos */}
        {page.videos.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-red-400" /> Watch Us Perform
            </h2>
            <div className="space-y-4">
              {page.videos.map((v, i) => {
                const embedUrl = getYouTubeEmbedUrl(v.url);
                if (!embedUrl) return null;
                return (
                  <div key={i}>
                    {v.title && <p className="text-sm text-muted-foreground mb-2">{v.title}</p>}
                    <div className="aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10">
                      <iframe
                        src={embedUrl}
                        title={v.title || `Video ${i + 1}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Contact Form */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="border border-white/10 rounded-2xl p-6 bg-white/[0.03]">
            <h2 className="text-lg font-display font-bold mb-1">Send a Booking Inquiry</h2>
            <p className="text-sm text-muted-foreground mb-6">Tell us about your event and we'll get back to you.</p>

            {submitted ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
                <h3 className="text-xl font-display font-bold">Inquiry Sent!</h3>
                <p className="text-muted-foreground">Thanks — we'll be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <span className="text-red-400">*</span> Your Name
                    </label>
                    <Input
                      name="name" value={form.name} onChange={handleChange}
                      placeholder="Full name" required
                      className="bg-black/40 border-white/15 focus:border-primary/50"
                      data-testid="input-booking-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-red-400">*</span> Email
                    </label>
                    <Input
                      name="email" value={form.email} onChange={handleChange}
                      type="email" placeholder="your@email.com" required
                      className="bg-black/40 border-white/15 focus:border-primary/50"
                      data-testid="input-booking-email"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Phone (optional)
                    </label>
                    <Input
                      name="phone" value={form.phone} onChange={handleChange}
                      placeholder="(555) 000-0000"
                      className="bg-black/40 border-white/15 focus:border-primary/50"
                      data-testid="input-booking-phone"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Event Date (optional)
                    </label>
                    <Input
                      name="eventDate" value={form.eventDate} onChange={handleChange}
                      type="date"
                      className="bg-black/40 border-white/15 focus:border-primary/50"
                      data-testid="input-booking-date"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Venue / Location
                    </label>
                    <Input
                      name="venue" value={form.venue} onChange={handleChange}
                      placeholder="Venue name or city"
                      className="bg-black/40 border-white/15 focus:border-primary/50"
                      data-testid="input-booking-venue"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Event Type</label>
                    <select
                      name="eventType" value={form.eventType} onChange={handleChange}
                      className="w-full bg-black/40 border border-white/15 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                      data-testid="select-booking-event-type"
                    >
                      <option value="">Select type…</option>
                      <option value="Bar / Restaurant">Bar / Restaurant</option>
                      <option value="Private Party">Private Party</option>
                      <option value="Corporate Event">Corporate Event</option>
                      <option value="Wedding">Wedding</option>
                      <option value="Festival">Festival</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Message (optional)</label>
                  <Textarea
                    name="message" value={form.message} onChange={handleChange}
                    placeholder="Tell us more about your event — expected attendance, set length, anything else we should know…"
                    rows={4}
                    className="bg-black/40 border-white/15 focus:border-primary/50 resize-none"
                    data-testid="textarea-booking-message"
                  />
                </div>

                <NeonButton type="submit" isLoading={isPending} className="w-full" data-testid="button-booking-submit">
                  <Mail className="w-4 h-4 mr-2" /> Send Inquiry
                </NeonButton>
              </form>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
