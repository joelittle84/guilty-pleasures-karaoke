import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export everything from auth models for integration compatibility
export * from "./models/auth";

// === TABLE DEFINITIONS ===

export const songs = pgTable("songs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  spotifyUrl: text("spotify_url"),
  genre: text("genre"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  participantName: text("participant_name").notNull(),
  // For simplicity in MVP, we can store up to 3 song IDs in a JSON array or simpler relational structure.
  // Since we want strict ordering and status per request, let's keep it simple: 
  // A request represents a submission by a user.
  status: text("status", { enum: ["pending", "approved", "completed", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A join table or just a simplified approach where we store the song selections for a request.
// Let's use a separate table for cleaner normalization and easier querying.
export const requestSongs = pgTable("request_songs", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => requests.id).notNull(),
  songId: integer("song_id").references(() => songs.id).notNull(),
  preferenceOrder: integer("preference_order").notNull(), // 1, 2, or 3
});


// === RELATIONS ===
import { relations } from "drizzle-orm";

export const requestsRelations = relations(requests, ({ many }) => ({
  songs: many(requestSongs),
}));

export const requestSongsRelations = relations(requestSongs, ({ one }) => ({
  request: one(requests, {
    fields: [requestSongs.requestId],
    references: [requests.id],
  }),
  song: one(songs, {
    fields: [requestSongs.songId],
    references: [songs.id],
  }),
}));


// === BASE SCHEMAS ===
export const insertSongSchema = createInsertSchema(songs).omit({ id: true, createdAt: true });
export const insertRequestSchema = createInsertSchema(requests).omit({ id: true, createdAt: true, status: true });
// For the API, the request input will likely include the song IDs
export const createRequestSchema = z.object({
  participantName: z.string().min(1, "Name is required"),
  songIds: z.array(z.number()).min(1, "At least one song must be selected").max(3, "Maximum 3 songs allowed"),
});


// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Request = typeof requests.$inferSelect;
export type RequestSong = typeof requestSongs.$inferSelect;

// Derived types for frontend display
export type RequestWithSongs = Request & {
  songs: (RequestSong & { song: Song })[];
};

// Request types
export type CreateSongRequest = InsertSong;
export type UpdateSongRequest = Partial<InsertSong>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestStatusInput = { status: 'pending' | 'approved' | 'completed' | 'rejected' };

// Response types
export type SongResponse = Song;
export type SongsListResponse = Song[];
export type RequestResponse = RequestWithSongs;
export type RequestsListResponse = RequestWithSongs[];
