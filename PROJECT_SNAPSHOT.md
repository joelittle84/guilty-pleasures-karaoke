# Project Snapshot: Guilty Pleasures Live Band Karaoke

## Overview

A live song request system for bands performing at events. Audience members browse the band's song catalog and submit song requests (up to 3) with their name. The band has a protected dashboard to manage songs, view/approve/reject requests, manage guest musicians, run live trivia, and control tip settings. The app features a rock/neon-themed dark UI designed for mobile-first use during live performances.

---

## Current Features

### Public Pages (Audience)

- **Home Page** - Song catalog browsing with search, select up to 3 songs, submit with name
- **Song Book** - Browse all songs by artist or grid view, search with instant filtering
- **Booking Page** - Event booking inquiry form (name, email, phone, event date, venue, event type, message)
- **Trivia** - Join live trivia sessions, answer questions, view leaderboard
- **Guest Guitarist Signup** - Sign up to play guitar with the band
- **Pre-Registration** - Pre-signup for events when window is open
- **QR Code Sharing** - Share the event page via QR code
- **Tip the Band** - Venmo/Zelle tipping (if configured)
- **Real-time Wait Time** - Polls queue info every 15 seconds

### Band Dashboard (Protected)

- **Live Queue** - View/approve/reject/complete song requests, sorted by signup time
- **Song Management** - Add/delete songs, toggle visibility, CSV batch upload (supports Exportify format), Spotify preview links
- **Guest Musicians** - Approve/complete musicians, swipe-to-dismiss completed, Clear All button
- **Pre-Signup** - Event pre-registration management with spot limits and time windows
- **Trivia** - Create trivia sessions using OpenTDB music API, configurable question count and timer, auto-advance, leaderboard
- **Settings** - Branding, QR code, Guitar mode, Tip handles (encrypted), Spotify credentials (encrypted), CSV import
- **Booking Manager** - View and manage booking inquiries

---

## Login Methods

### Band Dashboard Access
1. **Replit Auth** - OpenID Connect via Replit (for band owner)
2. **PIN Code** - 6-digit access PIN for band members (stored securely via bcrypt)

### Public Access
- No login required for audience features
- Trivia requires name entry only

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `songs` | Band's song catalog (title, artist, genre, Spotify URL, isActive, isDuet, isSolo) |
| `requests` | Audience song requests (participantName, status, isPresignup) |
| `request_songs` | Junction table linking requests to songs with preference order |
| `guest_musicians` | Guest musician signup requests (name, instrument, numSongs, status) |
| `settings` | Key-value store for app configuration (guitar mode, instructions, branding, encrypted credentials) |
| `trivia_sessions` | Live trivia sessions (song context, questions JSON, status, question index, timer) |
| `trivia_participants` | Players in trivia session (answers JSON, score) |
| `pre_signups` | Event pre-registrations (name, email, phone, notes) |
| `booking_inquiries` | Event booking requests (name, email, phone, eventDate, venue, eventType, message) |
| `users` | Replit Auth user storage |
| `sessions` | PostgreSQL-backed session storage (connect-pg-simple) |

---

## Deployment Requirements

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Encryption key for session cookies and AES-256-CBC encryption
- `REPL_ID` - Replit identifier for auth
- `ISSUER_URL` - Replit Auth OpenID Connect issuer

### Optional
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` - Stored encrypted in DB, not as env vars

### Database
- PostgreSQL (provided by Replit)
- Migrations via `drizzle-kit push`

### Build
- Frontend: Vite + React + TypeScript
- Backend: Express + TypeScript (tsx)
- Single port deployment (backend serves frontend)

---

## Known Limitations

1. **Spotify Playlist Sync** - Removed due to Spotify's 2024 API policy change (client credentials no longer work for playlist access). Workaround: Export via Exportify -> CSV import.

2. **No Real-time Updates** - Queue/polling uses 15-second intervals rather than WebSockets

3. **Single Venue** - Designed for one band at a time; no multi-tenancy

4. **No Offline Mode** - Requires internet connection for all features

5. **Session Storage** - 1-week TTL on sessions stored in PostgreSQL

6. **No Mobile App** - Web-only; no native iOS/Android app

7. **Trivia Questions** - Limited to OpenTDB music category (4 questions max per fetch)

---

## Future Ideas & Roadmap

### Short Term
- **WebSocket Support** - Real-time queue updates instead of polling
- **Push Notifications** - Notify users when their song is up next
- **Song Favorites** - Allow users to save favorite songs
- **Event History** - View past events and performance stats

### Medium Term
- **Multi-band Support** - Allow multiple bands to use the same platform
- **Custom Trivia Questions** - Band can create their own trivia questions
- **Song Ratings** - Audience can rate songs after performance
- **Social Sharing** - Share song requests to social media
- **Dark/Light Theme Toggle** - Support for light theme

### Long Term
- **Native Mobile App** - iOS/Android app with push notifications
- **Offline Mode** - Queue songs offline and sync when connected
- **Payment Integration** - Accept tips directly through the app
- **Analytics Dashboard** - Band performance metrics, popular songs, audience engagement
- **Integration with Spotify Web API** - OAuth-based user-level playlist access
- **AI Setlist Builder** - AI suggestions based on event type and audience

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **Auth**: Replit Auth (OIDC) + PIN-based access
- **Build**: Vite (frontend), esbuild (backend)
- **Routing**: Wouter (React router)
- **State**: TanStack Query (server state), React state (UI)
- **Icons**: Lucide React
- **Date**: date-fns
- **CSV**: PapaParse
- **QR**: qrcode.react

---

## Credits & Licensing

- Open Trivia Database (opentdb.com) for trivia questions
- Exportify (exportify.net) for Spotify playlist export workaround
- Replit Auth for authentication

---

*Last Updated: June 2026*
