import { z } from 'zod';
import { insertSongSchema, createRequestSchema, songs, requests, requestsRelations, requestSongs } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  songs: {
    list: {
      method: 'GET' as const,
      path: '/api/songs',
      input: z.object({
        search: z.string().optional(),
        activeOnly: z.boolean().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof songs.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/songs',
      input: insertSongSchema,
      responses: {
        201: z.custom<typeof songs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/songs/:id',
      input: insertSongSchema.partial(),
      responses: {
        200: z.custom<typeof songs.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/songs/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    search: { // Added for easier spotify lookup if we integrate later, but mainly for search bar
        method: 'GET' as const,
        path: '/api/songs/search',
        input: z.object({ q: z.string() }),
        responses: {
            200: z.array(z.custom<typeof songs.$inferSelect>()),
        }
    }
  },
  requests: {
    list: {
      method: 'GET' as const,
      path: '/api/requests', // Protected for band
      input: z.object({
          status: z.enum(['pending', 'approved', 'completed', 'rejected', 'all']).optional()
      }).optional(),
      responses: {
        200: z.array(z.custom<any>()), // Typed as RequestWithSongs in implementation
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/requests',
      input: createRequestSchema,
      responses: {
        201: z.custom<any>(), // Typed as RequestWithSongs
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/requests/:id/status', // Protected for band
      input: z.object({ status: z.enum(['pending', 'approved', 'completed', 'rejected']) }),
      responses: {
        200: z.custom<any>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
        method: 'DELETE' as const,
        path: '/api/requests/:id',
        responses: {
            204: z.void(),
            404: errorSchemas.notFound
        }
    }
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type SongInput = z.infer<typeof api.songs.create.input>;
export type RequestInput = z.infer<typeof api.requests.create.input>;
