# Replit.md

## Overview

This is a live song request system for bands performing at events. Audience members can browse the band's song catalog and submit up to 3 song requests with their name. The band has a protected dashboard to manage songs, view incoming requests, approve/reject them, manage guest musicians, run live trivia, and control tip settings. The application features a rock/neon-themed dark UI designed for mobile-first use during live performances.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with custom neon/dark theme, shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions + swipe-to-dismiss gestures
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared for shared)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with tsx for development
- **API Pattern**: RESTful endpoints under /api prefix
- **Route Definition**: Centralized in shared/routes.ts with Zod schemas for validation
- **Authentication**: Replit Auth integration via OpenID Connect with Passport.js
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Encryption**: AES-256-CBC via server/crypto.ts for payment handles and Spotify credentials (key derived from SESSION_SECRET)

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation
- **Schema Location**: shared/schema.ts contains all table definitions
- **Migrations**: drizzle-kit push for schema synchronization

### Key Data Models
- **songs**: Band's song catalog with title, artist, genre, Spotify URL, isActive visibility toggle
- **requests**: Audience song requests with participant name and status (pending/approved/completed/rejected)
- **requestSongs**: Junction table linking requests to songs with preference order
- **guestMusicians**: Guest musician signup requests, auto-sorted by signup time
- **settings**: Key-value store for app configuration (guitar mode, instructions, branding, encrypted payment/Spotify creds)
- **triviaSessions**: Live trivia sessions with song context, questions JSON, status, question index
- **triviaParticipants**: Players in a trivia session with answers JSON and score
- **users/sessions**: Replit Auth user storage and session management

### Authentication Flow
- Public routes: Song listing, request submission, guest musician signup, tips, trivia participation
- Protected routes (/band dashboard): Require Replit Auth login
- Session-based auth with 1-week TTL stored in PostgreSQL

## Features

### Band Dashboard Tabs
1. **Live Queue** - View/approve/reject/complete song requests, sorted by signup time
2. **Song Management** - Add/delete songs, toggle visibility (eye icon), CSV batch upload
3. **Guest Musicians** - Approve/complete musicians, swipe-to-dismiss completed, Clear All button, auto-sorted by time
4. **Trivia** - Create trivia sessions using opentdb music API, start/advance/complete questions, view leaderboard
5. **Settings** - Branding, QR code, Guitar mode, Tip handles (encrypted), Spotify credentials (encrypted) + playlist import

### Public Home Page
- Song catalog browsing with search
- Select up to 3 songs, submit with name
- Real-time wait time display (polls /api/queue-info every 15s)
- Tip the Band! button (shows Venmo/Zelle if configured)
- Play Trivia button (appears when active session exists, polls every 3s)
- Guest Guitarist signup
- Share QR code

### Encryption
- Venmo handle, Zelle handle, Spotify Client ID/Secret stored encrypted at rest (AES-256-CBC)
- /api/tips returns decrypted values for public display
- Encryption key derived from SESSION_SECRET env var

### Spotify Integration
- Enter Client ID + Secret in Settings (stored encrypted)
- Import entire playlist by URL - fetches all tracks via client credentials flow
- Also supports CSV batch upload (columns: title, artist, genre, spotifyUrl)

### Trivia System
- Questions fetched from Open Trivia Database (music category, 4 questions)
- Dashboard controls: create, start, next question, end/clear
- Public users opt in by entering name
- Real-time polling shows current question and answer state
- Color-coded answer feedback (green = correct, red = wrong)
- Leaderboard shown during and after game

## External Dependencies

### Database
- PostgreSQL via DATABASE_URL environment variable

### Authentication
- Replit Auth (OpenID Connect) via ISSUER_URL
- Requires REPL_ID and SESSION_SECRET environment variables

### Spotify (Optional)
- Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET saved via Settings dashboard
- Stored encrypted in DB, not as env vars

### Frontend Libraries
- @tanstack/react-query for data fetching
- @radix-ui primitives for accessible UI components
- framer-motion for animations and drag gestures
- date-fns for date formatting
- papaparse for CSV import
- qrcode.react for QR codes

### Development Tools
- Vite dev server with HMR
- Replit-specific plugins
- esbuild for production server bundling
