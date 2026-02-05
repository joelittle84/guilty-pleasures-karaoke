import { z } from 'zod';
import { insertSongSchema, createRequestSchema, insertGuestMusicianSchema, songs, requests, guestMusicians } from './schema';

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
  },
  requests: {
    list: {
      method: 'GET' as const,
      path: '/api/requests',
      input: z.object({
          status: z.enum(['pending', 'approved', 'completed', 'rejected', 'all']).optional()
      }).optional(),
      responses: {
        200: z.array(z.custom<any>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/requests',
      input: createRequestSchema,
      responses: {
        201: z.custom<any>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/requests/:id/status',
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
        404: errorSchemas.notFound,
      },
    },
  },
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings/:key',
      responses: {
        200: z.object({ value: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/settings/:key',
      input: z.object({ value: z.string() }),
      responses: {
        200: z.object({ value: z.string() }),
      },
    },
  },
  guestMusicians: {
    list: {
      method: 'GET' as const,
      path: '/api/guest-musicians',
      responses: {
        200: z.array(z.custom<typeof guestMusicians.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/guest-musicians',
      input: insertGuestMusicianSchema,
      responses: {
        201: z.custom<typeof guestMusicians.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/guest-musicians/:id/status',
      input: z.object({ status: z.enum(['pending', 'approved', 'completed', 'rejected']) }),
      responses: {
        200: z.custom<typeof guestMusicians.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

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
