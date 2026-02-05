import { db } from "./db";
import {
  songs, requests, requestSongs, users, settings, guestMusicians,
  type Song, type InsertSong, type UpdateSongRequest,
  type Request, type CreateRequestInput, type RequestWithSongs,
  type UpdateRequestStatusInput, type User, type UpsertUser,
  type Setting, type GuestMusician, type CreateGuestMusicianInput
} from "@shared/schema";
import { eq, ilike, desc, inArray, and } from "drizzle-orm";
import { IAuthStorage } from "./replit_integrations/auth/storage";

export interface IStorage extends IAuthStorage {
  // Songs
  getSongs(search?: string, activeOnly?: boolean): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: number, updates: UpdateSongRequest): Promise<Song>;
  deleteSong(id: number): Promise<void>;

  // Requests
  getRequests(status?: string): Promise<RequestWithSongs[]>;
  createRequest(input: CreateRequestInput): Promise<RequestWithSongs>;
  updateRequestStatus(id: number, status: string): Promise<RequestWithSongs>;
  deleteRequest(id: number): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | undefined>;
  updateSetting(key: string, value: string): Promise<string>;

  // Guest Musicians
  getGuestMusicians(): Promise<GuestMusician[]>;
  createGuestMusician(input: CreateGuestMusicianInput): Promise<GuestMusician>;
  updateGuestMusicianStatus(id: number, status: string): Promise<GuestMusician>;
}

export class DatabaseStorage implements IStorage {
  // === Auth Methods ===
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // === Song Methods ===
  async getSongs(search?: string, activeOnly: boolean = true): Promise<Song[]> {
    let query = db.select().from(songs);
    if (activeOnly) {
        query = query.where(eq(songs.isActive, true)) as any;
    }
    const results = await query.orderBy(desc(songs.createdAt));
    if (search) {
        const lower = search.toLowerCase();
        return results.filter(s => s.title.toLowerCase().includes(lower) || s.artist.toLowerCase().includes(lower));
    }
    return results;
  }

  async getSong(id: number): Promise<Song | undefined> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    return song;
  }

  async createSong(song: InsertSong): Promise<Song> {
    const [newSong] = await db.insert(songs).values(song).returning();
    return newSong;
  }

  async updateSong(id: number, updates: UpdateSongRequest): Promise<Song> {
    const [updated] = await db.update(songs).set(updates).where(eq(songs.id, id)).returning();
    return updated;
  }

  async deleteSong(id: number): Promise<void> {
    await db.delete(songs).where(eq(songs.id, id));
  }

  // === Request Methods ===
  async getRequests(status?: string): Promise<RequestWithSongs[]> {
    let requestQuery = db.select().from(requests);
    if (status && status !== 'all') {
      requestQuery = requestQuery.where(eq(requests.status, status as any)) as any;
    }
    const requestList = await requestQuery.orderBy(desc(requests.createdAt));
    if (requestList.length === 0) return [];
    const requestIds = requestList.map(r => r.id);
    const songsMap = await db
        .select({
            requestId: requestSongs.requestId,
            song: songs,
            preferenceOrder: requestSongs.preferenceOrder
        })
        .from(requestSongs)
        .innerJoin(songs, eq(requestSongs.songId, songs.id))
        .where(inArray(requestSongs.requestId, requestIds));
    return requestList.map(req => {
        const reqSongs = songsMap
            .filter(sm => sm.requestId === req.id)
            .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
            .map(sm => ({
                requestId: sm.requestId,
                songId: sm.song.id,
                preferenceOrder: sm.preferenceOrder,
                id: 0,
                song: sm.song
            }));
        return { ...req, songs: reqSongs as any };
    });
  }

  async createRequest(input: CreateRequestInput): Promise<RequestWithSongs> {
    return await db.transaction(async (tx) => {
        const [newRequest] = await tx.insert(requests).values({
            participantName: input.participantName,
            status: "pending"
        }).returning();
        let order = 1;
        for (const songId of input.songIds) {
            await tx.insert(requestSongs).values({
                requestId: newRequest.id,
                songId: songId,
                preferenceOrder: order++
            });
        }
        const selectedSongs = await tx.select().from(songs).where(inArray(songs.id, input.songIds));
        const orderedSongs = input.songIds.map((id, index) => {
            const s = selectedSongs.find(s => s.id === id);
            return {
                id: 0,
                requestId: newRequest.id,
                songId: id,
                preferenceOrder: index + 1,
                song: s!
            };
        });
        return { ...newRequest, songs: orderedSongs };
    });
  }

  async updateRequestStatus(id: number, status: string): Promise<RequestWithSongs> {
    const [updated] = await db.update(requests).set({ status: status as any }).where(eq(requests.id, id)).returning();
    const songsMap = await db
        .select({
            requestId: requestSongs.requestId,
            song: songs,
            preferenceOrder: requestSongs.preferenceOrder
        })
        .from(requestSongs)
        .innerJoin(songs, eq(requestSongs.songId, songs.id))
        .where(eq(requestSongs.requestId, id));
    return {
        ...updated,
        songs: songsMap.map(sm => ({
             id: 0, requestId: sm.requestId, songId: sm.song.id, preferenceOrder: sm.preferenceOrder, song: sm.song
        }))
    } as any;
  }

  async deleteRequest(id: number): Promise<void> {
    await db.delete(requestSongs).where(eq(requestSongs.requestId, id));
    await db.delete(requests).where(eq(requests.id, id));
  }

  // === Setting Methods ===
  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  }

  async updateSetting(key: string, value: string): Promise<string> {
    const [updated] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value },
      })
      .returning();
    return updated.value;
  }

  // === Guest Musician Methods ===
  async getGuestMusicians(): Promise<GuestMusician[]> {
    return await db.select().from(guestMusicians).orderBy(desc(guestMusicians.createdAt));
  }

  async createGuestMusician(input: CreateGuestMusicianInput): Promise<GuestMusician> {
    const [newGuest] = await db.insert(guestMusicians).values(input).returning();
    return newGuest;
  }

  async updateGuestMusicianStatus(id: number, status: string): Promise<GuestMusician> {
    const [updated] = await db
      .update(guestMusicians)
      .set({ status: status as any })
      .where(eq(guestMusicians.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
export const authStorage = storage;
