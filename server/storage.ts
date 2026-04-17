import { db } from "./db";
import {
  songs, requests, requestSongs, users, settings, guestMusicians,
  triviaSessions, triviaParticipants, preSignups,
  type Song, type InsertSong, type UpdateSongRequest,
  type Request, type CreateRequestInput, type RequestWithSongs,
  type User, type UpsertUser,
  type Setting, type GuestMusician, type CreateGuestMusicianInput,
  type TriviaSession, type TriviaParticipant, type TriviaQuestion, type TriviaSessionPublic,
  type PreSignup, type InsertPreSignup
} from "@shared/schema";
import { eq, ilike, desc, asc, inArray, and, lt } from "drizzle-orm";
import { IAuthStorage } from "./replit_integrations/auth/storage";

export interface IStorage extends IAuthStorage {
  getSongs(search?: string, activeOnly?: boolean): Promise<Song[]>;
  getSong(id: number): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSong(id: number, updates: UpdateSongRequest): Promise<Song>;
  deleteSong(id: number): Promise<void>;
  toggleSongActive(id: number): Promise<Song>;

  getRequests(status?: string): Promise<RequestWithSongs[]>;
  createRequest(input: CreateRequestInput): Promise<RequestWithSongs>;
  updateRequestStatus(id: number, status: string): Promise<RequestWithSongs>;
  deleteRequest(id: number): Promise<void>;

  getSetting(key: string): Promise<string | undefined>;
  updateSetting(key: string, value: string): Promise<string>;

  getGuestMusicians(): Promise<GuestMusician[]>;
  createGuestMusician(input: CreateGuestMusicianInput): Promise<GuestMusician>;
  updateGuestMusicianStatus(id: number, status: string): Promise<GuestMusician>;
  deleteGuestMusician(id: number): Promise<void>;
  clearCompletedGuests(): Promise<void>;

  createTriviaSession(songTitle: string, songArtist: string, questions: TriviaQuestion[], questionDurationSeconds?: number): Promise<TriviaSession>;
  getActiveTriviaSession(): Promise<TriviaSessionPublic | null>;
  getTriviaSession(id: number): Promise<TriviaSession | undefined>;
  updateTriviaSessionStatus(id: number, status: "waiting" | "active" | "completed"): Promise<TriviaSession>;
  advanceTriviaQuestion(id: number): Promise<TriviaSession>;
  joinTrivia(sessionId: number, playerName: string): Promise<TriviaParticipant>;
  submitTriviaAnswer(sessionId: number, playerName: string, answerIndex: number): Promise<{ correct: boolean; score: number }>;
  getTriviaLeaderboard(sessionId: number): Promise<{ playerName: string; score: number }[]>;
  deleteAllTriviaSessions(): Promise<void>;

  getPreSignups(): Promise<PreSignup[]>;
  createPreSignup(input: InsertPreSignup): Promise<PreSignup>;
  deletePreSignup(id: number): Promise<void>;
  clearPreSignups(): Promise<void>;
  countPreSignups(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData)
      .onConflictDoUpdate({ target: users.id, set: { ...userData, updatedAt: new Date() } })
      .returning();
    return user;
  }

  async getSongs(search?: string, activeOnly: boolean = true): Promise<Song[]> {
    let query = db.select().from(songs);
    if (activeOnly) query = query.where(eq(songs.isActive, true)) as any;
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

  async toggleSongActive(id: number): Promise<Song> {
    const [song] = await db.select().from(songs).where(eq(songs.id, id));
    const [updated] = await db.update(songs).set({ isActive: !song.isActive }).where(eq(songs.id, id)).returning();
    return updated;
  }

  async getRequests(status?: string): Promise<RequestWithSongs[]> {
    let requestQuery = db.select().from(requests);
    if (status && status !== 'all') {
      requestQuery = requestQuery.where(eq(requests.status, status as any)) as any;
    }
    const requestList = await requestQuery.orderBy(asc(requests.createdAt));
    if (requestList.length === 0) return [];
    const requestIds = requestList.map(r => r.id);
    const songsMap = await db.select({ requestId: requestSongs.requestId, song: songs, preferenceOrder: requestSongs.preferenceOrder })
      .from(requestSongs).innerJoin(songs, eq(requestSongs.songId, songs.id))
      .where(inArray(requestSongs.requestId, requestIds));
    return requestList.map(req => {
      const reqSongs = songsMap
        .filter(sm => sm.requestId === req.id)
        .sort((a, b) => a.preferenceOrder - b.preferenceOrder)
        .map(sm => ({ requestId: sm.requestId, songId: sm.song.id, preferenceOrder: sm.preferenceOrder, id: 0, song: sm.song }));
      return { ...req, songs: reqSongs as any };
    });
  }

  async createRequest(input: CreateRequestInput): Promise<RequestWithSongs> {
    return await db.transaction(async (tx) => {
      const [newRequest] = await tx.insert(requests).values({ participantName: input.participantName, status: "pending" }).returning();
      let order = 1;
      for (const songId of input.songIds) {
        await tx.insert(requestSongs).values({ requestId: newRequest.id, songId, preferenceOrder: order++ });
      }
      const selectedSongs = await tx.select().from(songs).where(inArray(songs.id, input.songIds));
      const orderedSongs = input.songIds.map((id, index) => {
        const s = selectedSongs.find(s => s.id === id);
        return { id: 0, requestId: newRequest.id, songId: id, preferenceOrder: index + 1, song: s! };
      });
      return { ...newRequest, songs: orderedSongs };
    });
  }

  async updateRequestStatus(id: number, status: string): Promise<RequestWithSongs> {
    const [updated] = await db.update(requests).set({ status: status as any }).where(eq(requests.id, id)).returning();
    const songsMap = await db.select({ requestId: requestSongs.requestId, song: songs, preferenceOrder: requestSongs.preferenceOrder })
      .from(requestSongs).innerJoin(songs, eq(requestSongs.songId, songs.id))
      .where(eq(requestSongs.requestId, id));
    return { ...updated, songs: songsMap.map(sm => ({ id: 0, requestId: sm.requestId, songId: sm.song.id, preferenceOrder: sm.preferenceOrder, song: sm.song })) } as any;
  }

  async deleteRequest(id: number): Promise<void> {
    await db.delete(requestSongs).where(eq(requestSongs.requestId, id));
    await db.delete(requests).where(eq(requests.id, id));
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  }

  async updateSetting(key: string, value: string): Promise<string> {
    const [updated] = await db.insert(settings).values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } }).returning();
    return updated.value;
  }

  async getGuestMusicians(): Promise<GuestMusician[]> {
    return await db.select().from(guestMusicians).orderBy(asc(guestMusicians.createdAt));
  }

  async createGuestMusician(input: CreateGuestMusicianInput): Promise<GuestMusician> {
    const [newGuest] = await db.insert(guestMusicians).values(input).returning();
    return newGuest;
  }

  async updateGuestMusicianStatus(id: number, status: string): Promise<GuestMusician> {
    const [updated] = await db.update(guestMusicians).set({ status: status as any }).where(eq(guestMusicians.id, id)).returning();
    return updated;
  }

  async deleteGuestMusician(id: number): Promise<void> {
    await db.delete(guestMusicians).where(eq(guestMusicians.id, id));
  }

  async clearCompletedGuests(): Promise<void> {
    await db.delete(guestMusicians).where(eq(guestMusicians.status, "completed"));
  }

  // ── Trivia ──────────────────────────────────────────────────────────────────

  async createTriviaSession(songTitle: string, songArtist: string, questions: TriviaQuestion[], questionDurationSeconds: number = 25): Promise<TriviaSession> {
    const [session] = await db.insert(triviaSessions).values({
      songTitle, songArtist, questions: JSON.stringify(questions),
      status: "waiting", currentQuestionIndex: 0, questionDurationSeconds,
    }).returning();
    return session;
  }

  /** Auto-advances question if the timer has expired. Safe to call on every poll. */
  private async _maybeAutoAdvance(session: TriviaSession): Promise<TriviaSession> {
    if (session.status !== "active" || !session.questionStartedAt) return session;
    const elapsed = (Date.now() - new Date(session.questionStartedAt).getTime()) / 1000;
    if (elapsed < session.questionDurationSeconds) return session;
    // Timer expired — advance
    return this.advanceTriviaQuestion(session.id);
  }

  async getActiveTriviaSession(): Promise<TriviaSessionPublic | null> {
    // Prefer active over waiting
    let [session] = await db.select().from(triviaSessions)
      .where(eq(triviaSessions.status, "active")).orderBy(desc(triviaSessions.createdAt)).limit(1);

    if (!session) {
      const [waiting] = await db.select().from(triviaSessions)
        .where(eq(triviaSessions.status, "waiting")).orderBy(desc(triviaSessions.createdAt)).limit(1);
      if (!waiting) {
        // Check for the most recent completed session (show results briefly)
        const [completed] = await db.select().from(triviaSessions)
          .where(eq(triviaSessions.status, "completed")).orderBy(desc(triviaSessions.createdAt)).limit(1);
        if (!completed) return null;
        const participants = await db.select().from(triviaParticipants).where(eq(triviaParticipants.sessionId, completed.id));
        const leaderboard = participants.map(p => ({ playerName: p.playerName, score: p.score })).sort((a, b) => b.score - a.score);
        const questions: TriviaQuestion[] = JSON.parse(completed.questions);
        return { id: completed.id, songTitle: completed.songTitle, songArtist: completed.songArtist, status: "completed", currentQuestionIndex: completed.currentQuestionIndex, currentQuestion: null, questionStartedAt: null, questionDurationSeconds: completed.questionDurationSeconds, secondsRemaining: null, totalQuestions: questions.length, participantCount: participants.length, leaderboard };
      }
      const participants = await db.select().from(triviaParticipants).where(eq(triviaParticipants.sessionId, waiting.id));
      const questions: TriviaQuestion[] = JSON.parse(waiting.questions);
      return { id: waiting.id, songTitle: waiting.songTitle, songArtist: waiting.songArtist, status: "waiting", currentQuestionIndex: 0, currentQuestion: null, questionStartedAt: null, questionDurationSeconds: waiting.questionDurationSeconds, secondsRemaining: null, totalQuestions: questions.length, participantCount: participants.length, leaderboard: [] };
    }

    // Auto-advance if needed
    session = await this._maybeAutoAdvance(session);

    const questions: TriviaQuestion[] = JSON.parse(session.questions);
    const participants = await db.select().from(triviaParticipants).where(eq(triviaParticipants.sessionId, session.id));
    const leaderboard = participants.map(p => ({ playerName: p.playerName, score: p.score })).sort((a, b) => b.score - a.score);

    let secondsRemaining: number | null = null;
    if (session.status === "active" && session.questionStartedAt) {
      const elapsed = (Date.now() - new Date(session.questionStartedAt).getTime()) / 1000;
      secondsRemaining = Math.max(0, session.questionDurationSeconds - elapsed);
    }

    return {
      id: session.id, songTitle: session.songTitle, songArtist: session.songArtist,
      status: session.status as any,
      currentQuestionIndex: session.currentQuestionIndex,
      currentQuestion: session.status === "active" ? (questions[session.currentQuestionIndex] || null) : null,
      questionStartedAt: session.questionStartedAt?.toISOString() || null,
      questionDurationSeconds: session.questionDurationSeconds,
      secondsRemaining,
      totalQuestions: questions.length, participantCount: participants.length, leaderboard,
    };
  }

  async getTriviaSession(id: number): Promise<TriviaSession | undefined> {
    const [session] = await db.select().from(triviaSessions).where(eq(triviaSessions.id, id));
    return session;
  }

  async updateTriviaSessionStatus(id: number, status: "waiting" | "active" | "completed"): Promise<TriviaSession> {
    const updates: any = { status };
    if (status === "active") updates.questionStartedAt = new Date();
    const [updated] = await db.update(triviaSessions).set(updates).where(eq(triviaSessions.id, id)).returning();
    return updated;
  }

  async advanceTriviaQuestion(id: number): Promise<TriviaSession> {
    const [session] = await db.select().from(triviaSessions).where(eq(triviaSessions.id, id));
    const questions: TriviaQuestion[] = JSON.parse(session.questions);
    const nextIndex = session.currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      const [updated] = await db.update(triviaSessions)
        .set({ status: "completed", currentQuestionIndex: nextIndex }).where(eq(triviaSessions.id, id)).returning();
      return updated;
    }
    const [updated] = await db.update(triviaSessions)
      .set({ currentQuestionIndex: nextIndex, questionStartedAt: new Date() }).where(eq(triviaSessions.id, id)).returning();
    return updated;
  }

  async joinTrivia(sessionId: number, playerName: string): Promise<TriviaParticipant> {
    const existing = await db.select().from(triviaParticipants)
      .where(and(eq(triviaParticipants.sessionId, sessionId), eq(triviaParticipants.playerName, playerName)));
    if (existing.length > 0) return existing[0];
    const [participant] = await db.insert(triviaParticipants).values({ sessionId, playerName, answers: "[]", score: 0 }).returning();
    return participant;
  }

  async submitTriviaAnswer(sessionId: number, playerName: string, answerIndex: number): Promise<{ correct: boolean; score: number }> {
    const [session] = await db.select().from(triviaSessions).where(eq(triviaSessions.id, sessionId));
    const questions: TriviaQuestion[] = JSON.parse(session.questions);
    const currentQ = questions[session.currentQuestionIndex];
    const correct = currentQ && answerIndex === currentQ.correctIndex;
    const [participant] = await db.select().from(triviaParticipants)
      .where(and(eq(triviaParticipants.sessionId, sessionId), eq(triviaParticipants.playerName, playerName)));
    if (!participant) return { correct: false, score: 0 };
    const answers = JSON.parse(participant.answers);
    if (answers.length <= session.currentQuestionIndex) {
      answers.push(answerIndex);
      const newScore = participant.score + (correct ? 1 : 0);
      await db.update(triviaParticipants).set({ answers: JSON.stringify(answers), score: newScore }).where(eq(triviaParticipants.id, participant.id));
      return { correct: !!correct, score: newScore };
    }
    return { correct: !!correct, score: participant.score };
  }

  async getTriviaLeaderboard(sessionId: number): Promise<{ playerName: string; score: number }[]> {
    const participants = await db.select().from(triviaParticipants)
      .where(eq(triviaParticipants.sessionId, sessionId)).orderBy(desc(triviaParticipants.score));
    return participants.map(p => ({ playerName: p.playerName, score: p.score }));
  }

  async deleteAllTriviaSessions(): Promise<void> {
    const sessions = await db.select().from(triviaSessions);
    for (const s of sessions) {
      await db.delete(triviaParticipants).where(eq(triviaParticipants.sessionId, s.id));
    }
    await db.delete(triviaSessions);
  }

  // ── Pre-Signups ─────────────────────────────────────────────────────────────

  async getPreSignups(): Promise<PreSignup[]> {
    return await db.select().from(preSignups).orderBy(asc(preSignups.createdAt));
  }

  async createPreSignup(input: InsertPreSignup): Promise<PreSignup> {
    const [signup] = await db.insert(preSignups).values(input).returning();
    return signup;
  }

  async deletePreSignup(id: number): Promise<void> {
    await db.delete(preSignups).where(eq(preSignups.id, id));
  }

  async clearPreSignups(): Promise<void> {
    await db.delete(preSignups);
  }

  async countPreSignups(): Promise<number> {
    const result = await db.select().from(preSignups);
    return result.length;
  }
}

export const storage = new DatabaseStorage();
export const authStorage = storage;
