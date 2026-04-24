import type { Express, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { encrypt, decrypt } from "./crypto";
import { z } from "zod";

const ENCRYPTED_KEYS = ["venmo_handle", "zelle_handle", "spotify_client_id", "spotify_client_secret"];

// Auth middleware: Replit Auth OR valid PIN session
const isBandAuthed: RequestHandler = (req, res, next) => {
  if ((req as any).isAuthenticated?.() || (req.session as any).bandAuthed) return next();
  res.status(401).json({ message: "Unauthorized" });
};

async function getSpotifyToken(): Promise<string | null> {
  try {
    const clientId = await storage.getSetting("spotify_client_id");
    const clientSecret = await storage.getSetting("spotify_client_secret");
    if (!clientId || !clientSecret) return null;
    const encoded = Buffer.from(`${decrypt(clientId)}:${decrypt(clientSecret)}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Authorization": `Basic ${encoded}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials"
    });
    const data = await res.json() as any;
    return data.access_token || null;
  } catch { return null; }
}

async function fetchTriviaQuestions(count: number = 4): Promise<any[]> {
  try {
    const res = await fetch(`https://opentdb.com/api.php?amount=${count}&category=12&type=multiple`);
    const data = await res.json() as any;
    if (data.response_code !== 0) throw new Error("API error");
    const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    return data.results.map((q: any) => {
      const options = [...q.incorrect_answers, q.correct_answer];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return { question: decode(q.question), options: options.map(decode), correctIndex: options.indexOf(q.correct_answer) };
    });
  } catch {
    return [
      { question: "Which decade saw the rise of karaoke in bars and clubs worldwide?", options: ["1970s", "1980s", "1990s", "2000s"], correctIndex: 1 },
      { question: "What does the word 'karaoke' mean in Japanese?", options: ["Empty stage", "Empty orchestra", "Singing alone", "No music"], correctIndex: 1 },
      { question: "Which instrument is most commonly featured in live band karaoke?", options: ["Violin", "Harp", "Guitar", "Banjo"], correctIndex: 2 },
    ];
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // === Band PIN Auth ===
  app.get("/api/band-auth/status", (req, res) => {
    const replitAuthed = (req as any).isAuthenticated?.() && !!(req.user as any)?.expires_at;
    const pinAuthed = !!(req.session as any).bandAuthed;
    res.json({ authed: replitAuthed || pinAuthed, method: replitAuthed ? "replit" : pinAuthed ? "pin" : null });
  });

  app.post("/api/band-auth/login", async (req, res) => {
    const { pin } = req.body as { pin: string };
    if (!pin) return res.status(400).json({ message: "PIN required" });
    const stored = await storage.getSetting("dashboard_pin");
    if (!stored) return res.status(403).json({ message: "No PIN configured — ask the band owner to set one in Settings" });
    if (pin !== stored) return res.status(401).json({ message: "Incorrect PIN" });
    (req.session as any).bandAuthed = true;
    req.session.save(() => res.json({ ok: true }));
  });

  app.post("/api/band-auth/logout", (req, res) => {
    (req.session as any).bandAuthed = false;
    req.session.save(() => res.json({ ok: true }));
  });

  // === Spotify Diagnostics ===
  app.get("/api/spotify-test", isAuthenticated, async (req, res) => {
    try {
      const token = await getSpotifyToken();
      if (!token) return res.json({ ok: false, step: "token", error: "Could not get token — check Client ID and Secret in Settings" });
      const playlistUrl = await storage.getSetting("spotify_playlist_url");
      if (!playlistUrl) return res.json({ ok: false, step: "url", error: "No playlist URL saved" });
      const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
      if (!match) return res.json({ ok: false, step: "parse", error: "Could not parse playlist ID from URL: " + playlistUrl });
      const playlistId = match[1];
      const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=1`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await r.json() as any;
      // Also test against a known public Spotify playlist
      const rTest = await fetch("https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks?limit=1", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const testData = await rTest.json() as any;
      res.json({ userPlaylist: { ok: r.ok, status: r.status, playlistId, total: data.total, hasItems: !!data.items, error: data.error, firstTrack: data.items?.[0]?.track?.name }, spotifyOfficialPlaylist: { ok: rTest.ok, status: rTest.status, total: testData.total, firstTrack: testData.items?.[0]?.track?.name, error: testData.error } });
    } catch (err: any) { res.json({ ok: false, error: err.message }); }
  });

  // === Songs ===
  app.get(api.songs.list.path, async (req, res) => {
    const search = req.query.search as string | undefined;
    const activeOnly = req.query.activeOnly !== 'false';
    const songs = await storage.getSongs(search, activeOnly);
    res.json(songs);
  });

  // Strip Spotify version suffixes from song titles (e.g. "- 2013 Remaster", "- Remastered", "- Live at...")
  function cleanSongTitle(title: string): string {
    return title.replace(/\s*-+\s*(\d{4}\s*[-\s]*)?(Remaster(ed)?|Live|Radio\s+Edit|Single\s+Version|Album\s+Version|Acoustic|Bonus|Demo|Extended|Deluxe|Anniversary|Mono|Stereo|Edit|Version|Mix)\b.*/gi, '').trim();
  }

  // CSV import with smart upsert: creates new songs, updates spotifyUrl on existing ones
  app.post("/api/songs/csv-import", isBandAuthed, async (req, res) => {
    const { songs: incoming } = req.body as { songs: { title: string; artist: string; genre?: string; spotifyUrl?: string }[] };
    if (!Array.isArray(incoming)) return res.status(400).json({ message: "Invalid payload" });
    let created = 0, updated = 0, skipped = 0;
    for (const s of incoming) {
      if (!s.title || !s.artist) continue;
      s.title = cleanSongTitle(s.title);
      const existing = await storage.getSongByTitleArtist(s.title, s.artist);
      if (existing) {
        if (s.spotifyUrl && !existing.spotifyUrl) {
          await storage.updateSong(existing.id, { spotifyUrl: s.spotifyUrl });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await storage.createSong({ title: s.title, artist: s.artist, genre: s.genre || "", spotifyUrl: s.spotifyUrl || "" });
        created++;
      }
    }
    res.json({ created, updated, skipped });
  });

  app.post(api.songs.create.path, isBandAuthed, async (req, res) => {
    try {
      const input = api.songs.create.input.parse(req.body);
      const song = await storage.createSong(input);
      res.status(201).json(song);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.songs.update.path, isBandAuthed, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.songs.update.input.parse(req.body);
      const song = await storage.updateSong(id, input);
      res.json(song);
    } catch { res.status(400).json({ message: "Update failed" }); }
  });

  app.post("/api/songs/bulk-delete", isBandAuthed, async (req, res) => {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((n: any) => Number(n)).filter((n: number) => !isNaN(n)) : [];
    const deleted = await storage.deleteSongs(ids);
    res.json({ deleted });
  });

  app.delete(api.songs.delete.path, isBandAuthed, async (req, res) => {
    await storage.deleteSong(Number(req.params.id));
    res.status(204).send();
  });

  app.patch("/api/songs/:id/toggle", isBandAuthed, async (req, res) => {
    const song = await storage.toggleSongActive(Number(req.params.id));
    res.json(song);
  });

  // Spotify playlist import (dedupes by spotifyUrl). Persists URL for future syncs.
  app.post("/api/songs/import-spotify", isBandAuthed, async (req, res) => {
    const { playlistUrl } = req.body;
    if (!playlistUrl) return res.status(400).json({ message: "playlistUrl required" });
    const token = await getSpotifyToken();
    if (!token) return res.status(400).json({ message: "Spotify credentials not configured. Add Client ID and Secret in Settings." });
    const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) return res.status(400).json({ message: "Invalid Spotify playlist URL" });
    const playlistId = match[1];
    try {
      await storage.updateSetting("spotify_playlist_url", playlistUrl);
      let offset = 0, total = Infinity, imported = 0, skipped = 0;
      while (offset < total) {
        const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=${offset}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await r.json() as any;
        if (!r.ok) {
          const msg = data?.error?.message || `Spotify API error (${r.status})`;
          const hint = r.status === 404 ? " — playlist not found or is private. Make the playlist Public in Spotify first." :
                       r.status === 401 ? " — invalid Spotify credentials. Re-save your Client ID and Secret." : "";
          return res.status(400).json({ message: msg + hint });
        }
        if (!data.items) break;
        total = data.total;
        for (const item of data.items) {
          if (!item.track) continue;
          const track = item.track;
          const url = track.external_urls?.spotify || "";
          if (url) {
            const existing = await storage.getSongBySpotifyUrl(url);
            if (existing) { skipped++; continue; }
          }
          await storage.createSong({
            title: track.name,
            artist: track.artists?.map((a: any) => a.name).join(", ") || "",
            spotifyUrl: url,
            genre: null,
            isActive: true,
          });
          imported++;
        }
        offset += 50;
        if (offset >= total) break;
      }
      res.json({ imported, skipped });
    } catch { res.status(500).json({ message: "Failed to import from Spotify" }); }
  });

  // Re-sync from saved playlist URL
  app.post("/api/songs/sync-spotify", isBandAuthed, async (req, res) => {
    const saved = await storage.getSetting("spotify_playlist_url");
    if (!saved) return res.status(400).json({ message: "No playlist URL saved. Import a playlist first." });
    req.body = { playlistUrl: saved };
    // Re-route to the import handler
    const token = await getSpotifyToken();
    if (!token) return res.status(400).json({ message: "Spotify credentials not configured." });
    const match = saved.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) return res.status(400).json({ message: "Invalid saved playlist URL" });
    const playlistId = match[1];
    try {
      let offset = 0, total = Infinity, imported = 0, skipped = 0;
      while (offset < total) {
        const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&offset=${offset}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await r.json() as any;
        console.log(`[Spotify sync] status=${r.status} hasItems=${!!data.items} total=${data.total} error=${JSON.stringify(data.error)}`);
        if (!r.ok) {
          const msg = data?.error?.message || `Spotify API error (${r.status})`;
          const hint = r.status === 404 ? " — playlist not found or is private. Make the playlist Public in Spotify first." :
                       r.status === 401 ? " — invalid Spotify credentials. Re-save your Client ID and Secret." : "";
          return res.status(400).json({ message: msg + hint });
        }
        if (!data.items) {
          console.log(`[Spotify sync] No items in response — full response keys: ${Object.keys(data).join(", ")}`);
          break;
        }
        total = data.total;
        for (const item of data.items) {
          if (!item.track) continue;
          const track = item.track;
          const url = track.external_urls?.spotify || "";
          if (url) {
            const existing = await storage.getSongBySpotifyUrl(url);
            if (existing) { skipped++; continue; }
          }
          await storage.createSong({
            title: track.name,
            artist: track.artists?.map((a: any) => a.name).join(", ") || "",
            spotifyUrl: url, genre: null, isActive: true,
          });
          imported++;
        }
        offset += 50;
        if (offset >= total) break;
      }
      res.json({ imported, skipped });
    } catch (err: any) { res.status(500).json({ message: err?.message || "Failed to sync from Spotify" }); }
  });

  // === Requests ===
  app.post(api.requests.create.path, async (req, res) => {
    try {
      const input = api.requests.create.input.parse(req.body);
      const request = await storage.createRequest(input);
      res.status(201).json(request);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      throw err;
    }
  });

  app.get(api.requests.list.path, isBandAuthed, async (req, res) => {
    const status = req.query.status as string | undefined;
    const requests = await storage.getRequests(status);
    res.json(requests);
  });

  app.patch(api.requests.updateStatus.path, isBandAuthed, async (req, res) => {
    const id = Number(req.params.id);
    const request = await storage.updateRequestStatus(id, req.body.status);
    res.json(request);
  });

  app.delete(api.requests.delete.path, isBandAuthed, async (req, res) => {
    await storage.deleteRequest(Number(req.params.id));
    res.status(204).send();
  });

  app.get("/api/queue-info", async (req, res) => {
    const pending = await storage.getRequests();
    const active = pending.filter(r => r.status === "pending" || r.status === "approved");
    res.json({ queueLength: active.length, estimatedMinutes: active.length * 4 });
  });

  // === Settings ===
  app.get(api.settings.get.path, async (req, res) => {
    const key = String(req.params.key);
    const value = await storage.getSetting(key);
    if (value === undefined) return res.status(404).json({ message: "Setting not found" });
    res.json({ value });
  });

  app.patch(api.settings.update.path, isBandAuthed, async (req, res) => {
    const key = String(req.params.key);
    // Only the Replit account owner can set/change the dashboard PIN
    if (key === "dashboard_pin" && !(req as any).isAuthenticated?.()) {
      return res.status(403).json({ message: "Only the account owner can change the PIN" });
    }
    let value = req.body.value;
    if (ENCRYPTED_KEYS.includes(key) && value) value = encrypt(value);
    const saved = await storage.updateSetting(key, value);
    res.json({ value: saved });
  });

  app.get("/api/tips", async (req, res) => {
    const venmoRaw = await storage.getSetting("venmo_handle");
    const zelleRaw = await storage.getSetting("zelle_handle");
    res.json({ venmo: venmoRaw ? decrypt(venmoRaw) : null, zelle: zelleRaw ? decrypt(zelleRaw) : null });
  });

  // === Guest Musicians ===
  app.get(api.guestMusicians.list.path, async (req, res) => {
    res.json(await storage.getGuestMusicians());
  });

  app.post(api.guestMusicians.create.path, async (req, res) => {
    try {
      const input = api.guestMusicians.create.input.parse(req.body);
      const guest = await storage.createGuestMusician(input);
      res.status(201).json(guest);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.guestMusicians.updateStatus.path, isBandAuthed, async (req, res) => {
    const guest = await storage.updateGuestMusicianStatus(Number(req.params.id), req.body.status);
    res.json(guest);
  });

  app.delete("/api/guest-musicians/completed/all", isBandAuthed, async (req, res) => {
    await storage.clearCompletedGuests();
    res.status(204).send();
  });

  app.delete("/api/guest-musicians/:id", isBandAuthed, async (req, res) => {
    await storage.deleteGuestMusician(Number(req.params.id));
    res.status(204).send();
  });

  // === Trivia ===
  app.get("/api/trivia/active", async (req, res) => {
    res.json(await storage.getActiveTriviaSession());
  });

  app.post("/api/trivia/join", async (req, res) => {
    const { sessionId, playerName } = req.body;
    if (!sessionId || !playerName) return res.status(400).json({ message: "sessionId and playerName required" });
    res.json(await storage.joinTrivia(Number(sessionId), playerName));
  });

  app.post("/api/trivia/answer", async (req, res) => {
    const { sessionId, playerName, answerIndex } = req.body;
    if (sessionId === undefined || !playerName || answerIndex === undefined) return res.status(400).json({ message: "Missing fields" });
    res.json(await storage.submitTriviaAnswer(Number(sessionId), playerName, Number(answerIndex)));
  });

  app.post("/api/trivia/sessions", isBandAuthed, async (req, res) => {
    const { songTitle, songArtist, questionCount = 4, questionDurationSeconds = 25 } = req.body;
    if (!songTitle || !songArtist) return res.status(400).json({ message: "songTitle and songArtist required" });
    const questions = await fetchTriviaQuestions(Math.min(5, Math.max(3, Number(questionCount))));
    const session = await storage.createTriviaSession(songTitle, songArtist, questions, Number(questionDurationSeconds));
    res.status(201).json(session);
  });

  app.patch("/api/trivia/sessions/:id/status", isBandAuthed, async (req, res) => {
    res.json(await storage.updateTriviaSessionStatus(Number(req.params.id), req.body.status));
  });

  app.post("/api/trivia/sessions/:id/next", isBandAuthed, async (req, res) => {
    res.json(await storage.advanceTriviaQuestion(Number(req.params.id)));
  });

  app.get("/api/trivia/sessions/:id/leaderboard", isBandAuthed, async (req, res) => {
    res.json(await storage.getTriviaLeaderboard(Number(req.params.id)));
  });

  app.delete("/api/trivia/sessions", isBandAuthed, async (req, res) => {
    await storage.deleteAllTriviaSessions();
    res.status(204).send();
  });

  // === Pre-Signups ===
  // Public: get pre-signup config/status
  app.get("/api/presignup/config", async (req, res) => {
    const [enabledRaw, limitRaw, windowStartRaw, windowEndRaw] = await Promise.all([
      storage.getSetting("presignup_enabled"),
      storage.getSetting("presignup_limit"),
      storage.getSetting("presignup_window_start"),
      storage.getSetting("presignup_window_end"),
    ]);
    const enabled = enabledRaw === "true";
    const limit = limitRaw ? parseInt(limitRaw) : 50;
    const windowStart = windowStartRaw || null;
    const windowEnd = windowEndRaw || null;
    const currentCount = await storage.countPreSignups();
    const now = new Date();
    const inWindow = (!windowStart || new Date(windowStart) <= now) && (!windowEnd || new Date(windowEnd) >= now);
    const isOpen = enabled && inWindow && currentCount < limit;
    res.json({ enabled, limit, windowStart, windowEnd, currentCount, isOpen, spotsRemaining: Math.max(0, limit - currentCount) });
  });

  // Public: create pre-signup
  app.post("/api/presignup", async (req, res) => {
    const { name, email, phone, notes, songIds } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    // Verify window is still open
    const [enabledRaw, limitRaw, windowStartRaw, windowEndRaw] = await Promise.all([
      storage.getSetting("presignup_enabled"),
      storage.getSetting("presignup_limit"),
      storage.getSetting("presignup_window_start"),
      storage.getSetting("presignup_window_end"),
    ]);
    const enabled = enabledRaw === "true";
    const limit = limitRaw ? parseInt(limitRaw) : 50;
    const now = new Date();
    const inWindow = (!windowStartRaw || new Date(windowStartRaw) <= now) && (!windowEndRaw || new Date(windowEndRaw) >= now);
    const currentCount = await storage.countPreSignups();
    if (!enabled || !inWindow || currentCount >= limit) {
      return res.status(400).json({ message: "Pre-signup is not available right now." });
    }

    const signup = await storage.createPreSignup({ name: name.trim(), email: email?.trim() || null, phone: phone?.trim() || null, notes: notes?.trim() || null });

    // If song selections provided, also add to the live queue
    if (Array.isArray(songIds) && songIds.length > 0) {
      const validSongIds = songIds.slice(0, 3).filter((id: any) => typeof id === "number");
      if (validSongIds.length > 0) {
        await storage.createRequest({ participantName: name.trim(), songIds: validSongIds, isPresignup: true });
      }
    }

    res.status(201).json(signup);
  });

  // Protected: list pre-signups
  app.get("/api/presignup", isBandAuthed, async (req, res) => {
    res.json(await storage.getPreSignups());
  });

  // Protected: delete one
  app.delete("/api/presignup/:id", isBandAuthed, async (req, res) => {
    await storage.deletePreSignup(Number(req.params.id));
    res.status(204).send();
  });

  // Protected: clear all
  app.delete("/api/presignup", isBandAuthed, async (req, res) => {
    await storage.clearPreSignups();
    res.status(204).send();
  });

  await seedDatabase();
  return httpServer;
}

export async function seedDatabase() {
  const songs = await storage.getSongs(undefined, false);
  const hasPlaylistUrl = await storage.getSetting("spotify_playlist_url");
  if (songs.length === 0 && !hasPlaylistUrl) {
    const initialSongs = [
      { title: "Don't Stop Believin'", artist: "Journey", genre: "Rock", spotifyUrl: "https://open.spotify.com/track/4bHsxqR3G5lLgZQVKnM1OL" },
      { title: "Bohemian Rhapsody", artist: "Queen", genre: "Rock", spotifyUrl: "https://open.spotify.com/track/3z8h0TU7NB750qJyF7RIvx" },
      { title: "Mr. Brightside", artist: "The Killers", genre: "Alternative", spotifyUrl: "https://open.spotify.com/track/003vvx7Niy0yvhvHt4a68B" },
      { title: "I Will Survive", artist: "Gloria Gaynor", genre: "Disco", spotifyUrl: "https://open.spotify.com/track/1fS371f4m4zFre3p9j1g5x" },
      { title: "Sweet Caroline", artist: "Neil Diamond", genre: "Pop", spotifyUrl: "https://open.spotify.com/track/62AuGbUA84TEPJ37lqVw3p" },
      { title: "Wonderwall", artist: "Oasis", genre: "Rock", spotifyUrl: "https://open.spotify.com/track/5qqabIl2vWzo9ApSC317sa" },
      { title: "Dancing Queen", artist: "ABBA", genre: "Pop", spotifyUrl: "https://open.spotify.com/track/0GjEhVFGZW8afUEmfCI7wM" },
      { title: "Shallow", artist: "Lady Gaga & Bradley Cooper", genre: "Pop", spotifyUrl: "https://open.spotify.com/track/2VxeLyX666F8uXCJ0dZF8B" },
      { title: "Tennessee Whiskey", artist: "Chris Stapleton", genre: "Country", spotifyUrl: "https://open.spotify.com/track/3fqwjXwUGN6vbzIwvyFMhx" },
      { title: "Valerie", artist: "Mark Ronson ft. Amy Winehouse", genre: "Soul", spotifyUrl: "https://open.spotify.com/track/4EbGVxT0TwEkwNqM2eT99G" }
    ];
    for (const s of initialSongs) await storage.createSong(s);
  }
}
