# Replit.md

## Overview

This is a live song request system for bands performing at events. Audience members can browse the band's song catalog and submit up to 3 song requests with their name. The band has a protected dashboard to manage songs, view incoming requests, approve/reject them, and manage guest musicians who want to sit in. The application features a rock/neon-themed dark UI designed for mobile-first use during live performances.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with custom neon/dark theme, shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with path aliases (@/ for client/src, @shared for shared)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with tsx for development
- **API Pattern**: RESTful endpoints under /api prefix
- **Route Definition**: Centralized in shared/routes.ts with Zod schemas for validation
- **Authentication**: Replit Auth integration via OpenID Connect with Passport.js
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation
- **Schema Location**: shared/schema.ts contains all table definitions
- **Migrations**: drizzle-kit push for schema synchronization

### Key Data Models
- **songs**: Band's song catalog with title, artist, genre, Spotify URL, active status
- **requests**: Audience song requests with participant name and status (pending/approved/completed/rejected)
- **requestSongs**: Junction table linking requests to songs with preference order
- **guestMusicians**: Guest musician signup requests with instrument and song count
- **settings**: Key-value store for app configuration (guitar mode, instructions)
- **users/sessions**: Replit Auth user storage and session management

### Authentication Flow
- Public routes: Song listing, request submission, guest musician signup
- Protected routes (/band dashboard): Require Replit Auth login
- Session-based auth with 1-week TTL stored in PostgreSQL

## External Dependencies

### Database
- PostgreSQL via DATABASE_URL environment variable
- Drizzle ORM for queries and schema management

### Authentication
- Replit Auth (OpenID Connect) via ISSUER_URL
- Requires REPL_ID and SESSION_SECRET environment variables

### Frontend Libraries
- @tanstack/react-query for data fetching
- @radix-ui primitives for accessible UI components
- framer-motion for animations
- date-fns for date formatting

### Development Tools
- Vite dev server with HMR
- Replit-specific plugins (cartographer, dev-banner, runtime-error-modal)
- esbuild for production server bundling