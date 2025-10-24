# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is an AI-powered video production pipeline for professional content creators, designed to transform news content and Instagram Reels into engaging short-form videos. It automates the entire production process through a 7-stage workflow, incorporating AI-driven content analysis, high-quality voiceover generation (ElevenLabs), and avatar video production (HeyGen). The project aims to scale video production, provide smart content analysis with virality scoring, and deliver professional-grade video output via a user-friendly interface.

## User Preferences
- **Theme**: Dark mode primary, light mode secondary
- **Design approach**: Professional, production-tool focused (Material Design 3 inspired)
- **Color scheme**: Deep slate backgrounds with vibrant blue primary
- **Typography**: Inter for UI, JetBrains Mono for code/API keys
- **Score visualization**: Color-coded gradient system (green 90-100, teal 70-89, amber 50-69, red below 50)

## System Architecture

### Tech Stack
**Frontend:**
- React with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Shadcn UI components + Tailwind CSS
- Theme support (dark/light mode)

**Backend:**
- Express.js + TypeScript
- PostgreSQL (Neon) database
- Drizzle ORM
- Replit Auth (OpenID Connect)
- Session management with encrypted storage

### Core Features & Design
- **7-Stage Workflow**: A structured pipeline guiding users from Source Selection (RSS feeds, custom scripts, Instagram Reels), Content Input, AI Analysis (scene breakdown, variants, scoring), Voice Generation, Avatar Selection, Final Export, to optional B-Roll Generation.
- **UI/UX**: Professional, dark-mode first design inspired by Material Design 3, utilizing Shadcn UI components for consistency. Features responsive design, with a mobile-adapted sidebar.
- **Enhanced Dashboard**: Rich project cards display auto-generated titles, thumbnail previews, color-coded progress bars, smart stats (scenes, duration, format), status badges, and interactive hover effects.
- **AI-powered Content Analysis**: Anthropic Claude is used for virality scoring (0-100) of news articles and Instagram Reels, detailed script analysis, scene breakdowns, and rewrite variants. Automated AI scoring triggers after content ingestion.
- **High-Quality Media Generation**: Integration with ElevenLabs for voice synthesis and HeyGen for AI avatar video generation. Optional B-roll generation is handled by Kie.ai.
- **Robust Data Handling**: All API keys are stored encrypted. Features auto-save for generated audio and reliable video generation with auto-resume capabilities, persisting video IDs and statuses to prevent data loss. Instagram Reels feature automatic video download, transcription (OpenAI Whisper), and AI scoring.
- **Project Management**: Includes features for managing projects with Drafts, Completed, and Deleted statuses, progress tracking, and auto-save. Backend enriches project data by extracting metadata for enhanced dashboard display.
- **Settings Management**: CRUD operations for API keys with encryption and masked display, and management of RSS and Instagram sources, including auto-parsing and topic categorization. Instagram sources include auto-monitoring capabilities with configurable intervals and notifications.
- **Security**: Utilizes Replit Auth for secure authentication. API keys are stored encrypted in the database.

### Database Schema
- `users`, `sessions`, `api_keys`, `rss_sources`, `rss_items`, `instagram_sources`, `instagram_items`, `projects`, `project_steps`.

## Recent Changes (October 2025)

### Security & Reliability Overhaul - Critical Production Fixes

**Authentication & Authorization (`server/routes.ts`):**
- ✅ **getUserId() utility**: Unified authentication - replaced 50+ instances of `req.user.claims.sub` with centralized `getUserId(req)` helper (supports both `req.user.id` and `req.user.claims.sub`)
- ✅ **Project ownership verification**: Added cross-tenant access protection to ALL project routes using `storage.getProjectById()`:
  - `/api/projects/:id/steps` (GET & POST) - prevents unauthorized step access
  - `/api/projects/:id/broll/generate-prompt` - verifies project ownership before AI prompts
  - `/api/projects/:id/broll/generate` - validates ownership before video generation
  - `/api/projects/:id/broll/status/:taskId` - prevents status checks for other users' projects
- ✅ **403 Forbidden responses**: Proper HTTP status codes for authorization failures (not 404 or 500)

**B-Roll Generation Improvements (`server/routes.ts`, `server/idempotency-utils.ts`):**
- ✅ **Idempotency protection**: Added `generateIdempotencyKey()` using crypto.createHash('sha256') based on projectId, sceneId, prompt, model, aspectRatio
- ✅ **Anti-duplicate safeguard**: Prevents duplicate video generation requests to Kie.ai API
- ✅ **Enhanced error handling**: Differentiated 404 (resource not found) vs 500 (server error) from Kie.ai, proper statusCode/apiMessage propagation

**HeyGen Integration Fixes (`server/routes.ts`):**
- ✅ **Audio/Voice validation**: Added XOR validation ensuring either `audioUrl` OR `voiceId` is provided (not both, not neither) - prevents "voice_id required" API errors
- ✅ **Better error messages**: Clear validation feedback before API calls to prevent wasted credits

**Storage Layer Enhancements (`server/storage.ts`):**
- ✅ **getProjectById() method**: New method returning projects without userId filtering (used for ownership verification in routes)
- ✅ **Interface consistency**: Added to both IStorage interface and DatabaseStorage implementation

**Impact**: Eliminates critical cross-tenant security vulnerabilities, prevents duplicate API charges, improves error handling, and strengthens data integrity.

---

### Apify Service Refactoring - Production Fixes
**Critical bug fixes in `server/apify-service.ts`:**
- ✅ **Actor ID corrected**: Fixed from 'instagram-reel-scraper' to 'apify/instagram-reels-scraper' (added const APIFY_ACTOR_ID)
- ✅ **Input field corrected**: Changed from `username` (singular) to `usernames` (plural array) per Apify API spec
- ✅ **Run status validation**: Added comprehensive checks for SUCCEEDED, FAILED, TIMED-OUT, ABORTED with detailed error messages
- ✅ **Dataset limits enforced**: Added `limit` parameter to prevent excessive data fetching
- ✅ **Enhanced field mapping**: Implemented fallback chains for videoUrl/video_url, thumbnailUrl/displayUrl, duration variants
- ✅ **Safe number conversion**: Added safeNumber() helper to convert float→integer for PostgreSQL compatibility
- ✅ **Empty video filtering**: Filter out reels without valid videoUrl before DB insertion
- ✅ **Mutual recovery**: Extract shortCode from URL (and vice versa) for data completeness
- ✅ **All functions updated**: scrapeInstagramReels, fetchSingleReelData, testApifyApiKey

**Impact**: Fixes Instagram Reels scraping failures, prevents database type errors, improves error diagnostics.

## External Dependencies
- **Anthropic Claude**: AI content analysis, news/Reel scoring, script analysis.
- **Apify**: `apify/instagram-reel-scraper` for Instagram Reels content extraction.
- **OpenAI Whisper**: Speech-to-text transcription for Instagram Reels.
- **ElevenLabs**: High-quality voice generation.
- **HeyGen**: Avatar video generation.
- **Kie.ai**: Optional AI B-roll footage generation.
- **Replit Auth**: Authentication services.
- **PostgreSQL (Neon)**: Primary database.