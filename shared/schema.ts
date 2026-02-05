import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
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
  status: text("status", { enum: ["pending", "approved", "completed", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const requestSongs = pgTable("request_songs", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => requests.id).notNull(),
  songId: integer("song_id").references(() => songs.id).notNull(),
  preferenceOrder: integer("preference_order").notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const guestMusicians = pgTable("guest_musicians", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  instrument: text("instrument").default("Guitar").notNull(),
  numSongs: integer("num_songs").default(2).notNull(),
  status: text("status", { enum: ["pending", "approved", "completed", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const insertGuestMusicianSchema = createInsertSchema(guestMusicians).omit({ id: true, createdAt: true, status: true });

export const createRequestSchema = z.object({
  participantName: z.string().min(1, "Name is required"),
  songIds: z.array(z.number()).min(1, "At least one song must be selected").max(3, "Maximum 3 songs allowed"),
});

// === EXPLICIT API CONTRACT TYPES ===
export type Song = typeof songs.$inferSelect;
export type InsertSong = z.infer<typeof insertSongSchema>;
export type Request = typeof requests.$inferSelect;
export type RequestSong = typeof requestSongs.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type GuestMusician = typeof guestMusicians.$inferSelect;

export type RequestWithSongs = Request & {
  songs: (RequestSong & { song: Song })[];
};

export type CreateSongRequest = InsertSong;
export type UpdateSongRequest = Partial<InsertSong>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestStatusInput = { status: 'pending' | 'approved' | 'completed' | 'rejected' };
export type CreateGuestMusicianInput = z.infer<typeof insertGuestMusicianSchema>;

// Response types
export type SongResponse = Song;
export type SongsListResponse = Song[];
export type RequestResponse = RequestWithSongs;
export type RequestsListResponse = RequestWithSongs[];
export type GuestMusicianResponse = GuestMusician;
export type GuestMusiciansListResponse = GuestMusician[];
