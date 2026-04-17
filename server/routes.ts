import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { encrypt, decrypt } from "./crypto";
import { z } from "zod";

// Encrypted setting keys
const ENCRYPTED_KEYS = ["venmo_handle", "zelle_handle", "spotify_client_id", "spotify_client_secret"];

async function getSpotifyToken(): Promise<string | null> {
  try {
    const clientId = await storage.getSetting("spotify_client_id");
    const clientSecret = await storage.getSetting("spotify_client_secret");
    if (!clientId || !clientSecret) return null;
    const decryptedId = decrypt(clientId);
    const decryptedSecret = decrypt(clientSecret);
    const encoded = Buffer.from(`${decryptedId}:${decryptedSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Authorization": `Basic ${encoded}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials"
    });
    const data = await res.json() as any;
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function fetchTriviaQuestions(songTitle: string, songArtist: string): Promise<any[]> {
  try {
    const res = await fetch("https://opentdb.com/api.php?amount=4&category=12&type=multiple");
    const data = await res.json() as any;
    if (data.response_code !== 0) throw new Error("API error");
    return data.results.map((q: any) => {
      const options = [...q.incorrect_answers, q.correct_answer];
      // Shuffle options
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      const correctIndex = options.indexOf(q.correct_answer);
      // Decode HTML entities
      const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
      return {
        question: decode(q.question),
        options: options.map(decode),
        correctIndex
      };
    });
  } catch {
    // Fallback questions if API fails
    return [
      {
        question: `What genre is "${songTitle}" by ${songArtist} most associated with?`,
        options: ["Pop", "Rock", "R&B", "Country"],
        correctIndex: 0
      },
      {
        question: `Which decade saw a major rise in band karaoke performances?`,
        options: ["1980s", "1990s", "2000s", "2010s"],
        correctIndex: 2
      }
    ];
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // === Public: Songs ===
  app.get(api.songs.list.path, async (req, res) => {
    const search = req.query.search as string | undefined;
    const activeOnly = req.query.activeOnly !== 'false';
    const songs = await storage.getSongs(search, activeOnly);
    res.json(songs);
  });

  // === Protected: Song Management ===
  app.post(api.songs.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.songs.create.input.parse(req.body);
      const song = await storage.createSong(input);
      res.status(201).json(song);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.songs.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.songs.update.input.parse(req.body);
      const song = await storage.updateSong(id, input);
      res.json(song);
    } catch {
      res.status(400).json({ message: "Update failed" });
    }
  });

  app.delete(api.songs.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteSong(Number(req.params.id));
    res.status(204).send();
  });

  app.patch("/api/songs/:id/toggle", isAuthenticated, async (req, res) => {
    const song = await storage.toggleSongActive(Number(req.params.id));
    res.json(song);
  });

  // Spotify playlist import
  app.post("/api/songs/import-spotify", isAuthenticated, async (req, res) => {
    const { playlistUrl } = req.body;
    if (!playlistUrl) return res.status(400).json({ message: "playlistUrl required" });

    const token = await getSpotifyToken();
    if (!token) return res.status(400).json({ message: "Spotify credentials not configured. Add Client ID and Secret in Settings." });

    // Extract playlist ID from URL
    const match = playlistUrl.match(/playlist\/([a-zA-Z0-9]+)/);
    if (!match) return res.status(400).json({ message: "Invalid Spotify playlist URL" });
    const playlistId = match[1];

    try {
      let offset = 0;
      const limit = 50;
      let total = Infinity;
      let imported = 0;

      while (offset < total) {
        const r = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await r.json() as any;
        if (!data.items) break;
        total = data.total;

        for (const item of data.items) {
          if (!item.track) continue;
          const track = item.track;
          const artists = track.artists?.map((a: any) => a.name).join(", ") || "";
          const genre = track.album?.genres?.[0] || "";
          await storage.createSong({
            title: track.name,
            artist: artists,
            spotifyUrl: track.external_urls?.spotify || "",
            genre: genre || null,
            isActive: true,
          });
          imported++;
        }
        offset += limit;
        if (offset >= total) break;
      }
      res.json({ imported });
    } catch (err) {
      res.status(500).json({ message: "Failed to import from Spotify" });
    }
  });

  // === Public: Requests ===
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

  // === Protected: Requests ===
  app.get(api.requests.list.path, isAuthenticated, async (req, res) => {
    const status = req.query.status as string | undefined;
    const requests = await storage.getRequests(status);
    res.json(requests);
  });

  app.patch(api.requests.updateStatus.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    const request = await storage.updateRequestStatus(id, status);
    res.json(request);
  });

  app.delete(api.requests.delete.path, isAuthenticated, async (req, res) => {
    await storage.deleteRequest(Number(req.params.id));
    res.status(204).send();
  });

  // Public: queue info for wait times
  app.get("/api/queue-info", async (req, res) => {
    const pending = await storage.getRequests();
    const activeItems = pending.filter(r => r.status === "pending" || r.status === "approved");
    res.json({
      queueLength: activeItems.length,
      estimatedMinutes: activeItems.length * 4,
    });
  });

  // === Settings ===
  app.get(api.settings.get.path, async (req, res) => {
    const key = String(req.params.key);
    const value = await storage.getSetting(key);
    if (value === undefined) return res.status(404).json({ message: "Setting not found" });
    res.json({ value });
  });

  app.patch(api.settings.update.path, isAuthenticated, async (req, res) => {
    const key = String(req.params.key);
    let value = req.body.value;
    if (ENCRYPTED_KEYS.includes(key) && value) {
      value = encrypt(value);
    }
    const saved = await storage.updateSetting(key, value);
    res.json({ value: saved });
  });

  // Public: get decrypted tip handles
  app.get("/api/tips", async (req, res) => {
    const venmoRaw = await storage.getSetting("venmo_handle");
    const zelleRaw = await storage.getSetting("zelle_handle");
    res.json({
      venmo: venmoRaw ? decrypt(venmoRaw) : null,
      zelle: zelleRaw ? decrypt(zelleRaw) : null,
    });
  });

  // === Guest Musicians ===
  app.get(api.guestMusicians.list.path, async (req, res) => {
    const guests = await storage.getGuestMusicians();
    res.json(guests);
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

  app.patch(api.guestMusicians.updateStatus.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const guest = await storage.updateGuestMusicianStatus(id, req.body.status);
    res.json(guest);
  });

  app.delete("/api/guest-musicians/:id", isAuthenticated, async (req, res) => {
    await storage.deleteGuestMusician(Number(req.params.id));
    res.status(204).send();
  });

  app.delete("/api/guest-musicians/completed/all", isAuthenticated, async (req, res) => {
    await storage.clearCompletedGuests();
    res.status(204).send();
  });

  // === Trivia ===
  // Public: get active session
  app.get("/api/trivia/active", async (req, res) => {
    const session = await storage.getActiveTriviaSession();
    res.json(session);
  });

  // Public: join trivia
  app.post("/api/trivia/join", async (req, res) => {
    const { sessionId, playerName } = req.body;
    if (!sessionId || !playerName) return res.status(400).json({ message: "sessionId and playerName required" });
    const participant = await storage.joinTrivia(Number(sessionId), playerName);
    res.json(participant);
  });

  // Public: submit answer
  app.post("/api/trivia/answer", async (req, res) => {
    const { sessionId, playerName, answerIndex } = req.body;
    if (sessionId === undefined || !playerName || answerIndex === undefined) {
      return res.status(400).json({ message: "sessionId, playerName, and answerIndex required" });
    }
    const result = await storage.submitTriviaAnswer(Number(sessionId), playerName, Number(answerIndex));
    res.json(result);
  });

  // Protected: create trivia session
  app.post("/api/trivia/sessions", isAuthenticated, async (req, res) => {
    const { songTitle, songArtist } = req.body;
    if (!songTitle || !songArtist) return res.status(400).json({ message: "songTitle and songArtist required" });
    const questions = await fetchTriviaQuestions(songTitle, songArtist);
    const session = await storage.createTriviaSession(songTitle, songArtist, questions);
    res.status(201).json(session);
  });

  // Protected: update session status (start/complete)
  app.patch("/api/trivia/sessions/:id/status", isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;
    const session = await storage.updateTriviaSessionStatus(id, status);
    res.json(session);
  });

  // Protected: advance to next question
  app.post("/api/trivia/sessions/:id/next", isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const session = await storage.advanceTriviaQuestion(id);
    res.json(session);
  });

  // Protected: get leaderboard
  app.get("/api/trivia/sessions/:id/leaderboard", isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const lb = await storage.getTriviaLeaderboard(id);
    res.json(lb);
  });

  // Protected: delete all trivia
  app.delete("/api/trivia/sessions", isAuthenticated, async (req, res) => {
    await storage.deleteAllTriviaSessions();
    res.status(204).send();
  });

  await seedDatabase();
  return httpServer;
}

export async function seedDatabase() {
  const songs = await storage.getSongs(undefined, false);
  if (songs.length === 0) {
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
    for (const s of initialSongs) {
      await storage.createSong(s);
    }
  }
}
