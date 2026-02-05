import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === Auth Setup ===
  await setupAuth(app);
  registerAuthRoutes(app);

  // === Public Routes ===

  // List Songs
  app.get(api.songs.list.path, async (req, res) => {
    const search = req.query.search as string | undefined;
    const activeOnly = req.query.activeOnly === 'true';
    const songs = await storage.getSongs(search, activeOnly);
    res.json(songs);
  });

  // Create Request (Public)
  app.post(api.requests.create.path, async (req, res) => {
    try {
      const input = api.requests.create.input.parse(req.body);
      const request = await storage.createRequest(input);
      res.status(201).json(request);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });


  // === Protected Routes (Band Only) ===
  
  // Manage Songs
  app.post(api.songs.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.songs.create.input.parse(req.body);
      const song = await storage.createSong(input);
      res.status(201).json(song);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
       }
       res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.songs.update.path, isAuthenticated, async (req, res) => {
     try {
        const id = Number(req.params.id);
        const input = api.songs.update.input.parse(req.body);
        const song = await storage.updateSong(id, input);
        res.json(song);
     } catch (err) {
         res.status(400).json({ message: "Update failed" });
     }
  });

  app.delete(api.songs.delete.path, isAuthenticated, async (req, res) => {
     await storage.deleteSong(Number(req.params.id));
     res.status(204).send();
  });

  // Manage Requests
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

  // === Settings Routes ===
  app.get(api.settings.get.path, async (req, res) => {
    const value = await storage.getSetting(req.params.key);
    if (value === undefined) return res.status(404).json({ message: "Setting not found" });
    res.json({ value });
  });

  app.patch(api.settings.update.path, isAuthenticated, async (req, res) => {
    const value = await storage.updateSetting(req.params.key, req.body.value);
    res.json({ value });
  });

  // === Guest Musician Routes ===
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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.guestMusicians.updateStatus.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const guest = await storage.updateGuestMusicianStatus(id, req.body.status);
    res.json(guest);
  });

  await seedDatabase();

  return httpServer;
}

// Seed function to add some initial songs if empty
export async function seedDatabase() {
    const songs = await storage.getSongs();
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
