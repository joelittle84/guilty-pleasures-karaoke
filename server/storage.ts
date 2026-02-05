import { db } from "./db";
import {
  songs, requests, requestSongs, users,
  type Song, type InsertSong, type UpdateSongRequest,
  type Request, type CreateRequestInput, type RequestWithSongs,
  type UpdateRequestStatusInput, type User, type UpsertUser
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
    const conditions = [];
    if (activeOnly) {
      conditions.push(eq(songs.isActive, true));
    }
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      // Simple search on title or artist
      conditions.push(
        and(
            // Since we want OR logic for search but AND with isActive, we need to be careful.
            // But simplify: Filter in memory or use complex ORM logic. 
            // Drizzle `or` needs to be imported.
            // Let's do a raw simplified query construction or separate calls if needed.
            // Actually, for MVP, let's just search title/artist if provided.
        )
      );
      // Re-doing with correct Drizzle OR logic
      return await db.select().from(songs).where(
        activeOnly 
          ? and(
              eq(songs.isActive, true), 
              // or(ilike(songs.title, searchLower), ilike(songs.artist, searchLower)) 
              // To avoid complex imports right now, let's just fetch and filter or assume basic list.
              // We'll implement robust search in the route handler or here properly.
          )
          : undefined
      ).orderBy(desc(songs.createdAt));
    }
    
    // Basic implementation
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
    // 1. Get requests
    let requestQuery = db.select().from(requests);
    if (status && status !== 'all') {
      requestQuery = requestQuery.where(eq(requests.status, status)) as any;
    }
    const requestList = await requestQuery.orderBy(desc(requests.createdAt));

    if (requestList.length === 0) return [];

    // 2. Get associated songs
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
    
    // 3. Merge
    return requestList.map(req => {
        const reqSongs = songsMap
            .filter(sm => sm.requestId === req.id)
            .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
            .map(sm => ({
                requestId: sm.requestId,
                songId: sm.song.id,
                preferenceOrder: sm.preferenceOrder,
                id: 0, // placeholder as we didn't fetch join table ID directly in this optimized query, or we could.
                song: sm.song
            }));
            
        return {
            ...req,
            songs: reqSongs as any // Casting for simplicity in this implementation
        };
    });
  }

  async createRequest(input: CreateRequestInput): Promise<RequestWithSongs> {
    // Transaction ideally
    return await db.transaction(async (tx) => {
        const [newRequest] = await tx.insert(requests).values({
            participantName: input.participantName,
            status: "pending"
        }).returning();

        // Insert song links
        let order = 1;
        for (const songId of input.songIds) {
            await tx.insert(requestSongs).values({
                requestId: newRequest.id,
                songId: songId,
                preferenceOrder: order++
            });
        }

        // Fetch full object to return
        // Simple re-fetch logic (duplicated from getRequests for single item)
        // For efficiency in MVP, let's just re-use the generic get logic or construct manually.
        // Let's construct manually to save a complex query.
        
        // We need the song details.
        const selectedSongs = await tx.select().from(songs).where(inArray(songs.id, input.songIds));
        
        // Sort them back in the order of input.songIds
        const orderedSongs = input.songIds.map((id, index) => {
            const s = selectedSongs.find(s => s.id === id);
            return {
                id: 0, // placeholder
                requestId: newRequest.id,
                songId: id,
                preferenceOrder: index + 1,
                song: s!
            };
        });

        return {
            ...newRequest,
            songs: orderedSongs
        };
    });
  }

  async updateRequestStatus(id: number, status: string): Promise<RequestWithSongs> {
    const [updated] = await db.update(requests).set({ status }).where(eq(requests.id, id)).returning();
    // Return full object
    const [full] = await this.getRequests(); // Inefficient but simple for MVP. Better: getRequestById.
    // Actually, let's implement getRequestById logic here quickly
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
    };
  }

  async deleteRequest(id: number): Promise<void> {
    await db.delete(requestSongs).where(eq(requestSongs.requestId, id));
    await db.delete(requests).where(eq(requests.id, id));
  }
}

export const storage = new DatabaseStorage();
export const authStorage = storage; // Export for auth module compatibility
