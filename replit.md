# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is a comprehensive AI-powered video production pipeline designed for professional content creators to efficiently transform news content into engaging short-form videos. It automates the video production process from source selection to final export through a 7-stage workflow, featuring AI-driven content analysis, high-quality voiceover generation (ElevenLabs), and avatar video production (HeyGen). The project aims to scale video production, provide smart content analysis with virality scoring, and deliver professional-grade video output through a user-friendly interface.

## Recent Updates

### October 23, 2025
- **Instagram Integration - Phase 6 Complete**: AI Content Analysis for Instagram Reels
  - Created `scoreInstagramReel()` function in ai-service.ts using Anthropic Claude for analyzing transcribed Reels
  - Comprehensive analysis: transcription text + caption + engagement metrics → 0-100 score + Russian commentary
  - Score breakdown: freshnessScore (timing/trends), viralityScore (hooks/emotional triggers), qualityScore (content value)
  - Automatic AI scoring: Triggers automatically after successful transcription completion (background, non-blocking)
  - Added storage method: `updateInstagramItemAiScore()` for persisting all AI analysis results
  - API endpoint: POST `/api/instagram/items/:id/score` for manual AI analysis triggers
  - UI enhancements: "Analyze with AI" button (Sparkles icon), AI comment display with italic border styling
  - Smart button visibility: Only shows when transcription completed but AI score not yet assigned
  - Background processing pattern: transcription → auto-score → complete (fully automated pipeline)
  - Critical milestone: Instagram Reels now have complete parity with RSS news AI analysis capabilities

- **Instagram Integration - Phase 5 Complete**: Automatic Video Transcription implemented
  - Extended schema with transcription fields (transcriptionText, transcriptionStatus, transcriptionError, language)
  - Created `server/transcription-service.ts` using OpenAI Whisper-1 model for speech-to-text
  - Implemented retry logic (3 attempts, exponential backoff) with file validation and error handling
  - Added storage method: `updateInstagramItemTranscription()` for status tracking
  - API endpoint: POST `/api/instagram/items/:id/transcribe` for manual transcription triggers
  - Automatic transcription: Auto-starts after successful video download in background (non-blocking)
  - Transcription flow: pending → processing → completed/failed
  - UI updates: Transcription status badges in Reels cards (MessageSquare icon, color-coded)
  - Critical for Phase 6: Transcribed text enables AI content analysis of Instagram Reels
  - OpenAI API key stored encrypted, accessed via `getUserApiKey()` pattern

- **Instagram Integration - Phase 4 Complete**: Content Selection UI implemented
  - Created `/instagram-reels` page with card-based layout for browsing scraped Reels
  - Comprehensive filtering: search (caption/username), source, AI score range, engagement metrics, download status
  - Fixed critical bug: null AI scores now treated as 0 for filtering (visible when minScore=0, hidden when minScore>0)
  - Video preview cards with thumbnails, play overlay, duration badge, engagement stats (views/likes/comments)
  - User actions: Select (marks for project use) and Dismiss (hides from view)
  - API endpoint: PATCH `/api/instagram/items/:id/action` with authentication and ownership validation
  - Navigation: Added "Instagram Reels" button to home page quick actions
  - UI mirrors RSS news Stage 2 pattern for consistency across content sources
  - Production-ready: Architect review passed - all filters work correctly with AND logic

### October 22, 2025
- **Instagram Integration - Phase 3.5 Complete**: Video Download System implemented
  - Added schema fields: localVideoPath, localThumbnailPath, downloadStatus, downloadError
  - Created `server/instagram-download.ts` with retry logic (3 attempts, exponential backoff, 60s timeout)
  - Implemented `updateInstagramItemDownloadStatus()` storage method
  - Integrated background download in parse route (non-blocking)
  - Videos saved to `/uploads/instagram-reels/{id}.mp4` (critical for Phase 5 transcription)
  - Status flow: pending → downloading → completed/failed
  - Infrastructure: directory created, .gitignore updated
  - Production-ready: Architect review passed - solves Apify URL expiration problem (24-48h)

- **Instagram Integration - Phase 3 Complete**: Instagram Items Storage implemented
  - Created `instagram_items` table with comprehensive schema (video metadata, engagement metrics, AI scoring fields)
  - Added UNIQUE constraint on (userId, externalId) to prevent duplicate Reels
  - Implemented Storage methods: `getInstagramItems()`, `createInstagramItem()`, `updateInstagramItemAction()`
  - Enhanced parse endpoint to save scraped Reels to database with duplicate detection
  - Added GET `/api/instagram/items` endpoint with optional sourceId filtering
  - Efficient bulk insert with per-item error handling (savedCount/skippedCount tracking)
  - Smart sorting: AI score descending → published date descending
  - Production-ready: Architect review passed with database-level duplicate protection

- **Instagram Integration - Phase 2 Complete**: Apify scraping service fully integrated
  - Created `server/apify-service.ts` with `scrapeInstagramReels()` function using official `apify/instagram-reel-scraper` actor
  - Implemented API key validation with `testApifyApiKey()` before scraping to prevent failed runs
  - Added POST `/api/instagram/sources/:id/parse` endpoint with ownership validation and status tracking
  - Parse button in Settings UI with Instagram icon, status badges (pending/parsing/success/error)
  - Full error handling: missing keys, invalid keys, scraping failures all surface to UI with clear messages
  - Status flow: pending → parsing → success (with itemCount) or error (with parseError)
  - Production-ready: Architect review passed with proper credential decryption via `getUserApiKey()`

### October 17, 2025
- **Source Identification**: News cards now display source name with 📰 emoji (e.g., "📰 TechCrunch • 2h ago")
- **Source Filtering**: Dropdown filter with "All Sources" option plus all user's RSS sources for targeted content selection
- **Date Range Filtering**: Added "From" and "To" date pickers with full-day inclusive filtering (normalized boundaries: start 00:00:00, end 23:59:59.999)
- **Extended Parsing**: New "Parse Extended" button fetches all available RSS items with date range awareness (RSS limitations documented in UI)
- **Enhanced Filter Logic**: All filters (search, dismissed/used, freshness, score, source, date range) now work together with AND logic
- **Critical Bug Fix**: Fixed getRssItems() to return items from all user sources (previously only returned from first source)

### October 16, 2025
- **Automatic AI Scoring**: News articles are now automatically scored when loading Stage 2, using Anthropic Claude to analyze virality potential (0-100 scale) with Russian commentary
- **Smart News Sorting**: Articles intelligently sorted by AI score (highest first) and publication date (freshest first when scores equal)
- **Visual Score Badges**: Color-coded badges display AI scores with intuitive color scheme (green 70-100, yellow 50-69, red <50)
- **API Key Testing**: New "Test API Key" button in Settings allows validating Anthropic credentials directly from the UI
- **Enhanced Security**: Removed API key logging to prevent secret exposure, added ownership validation for all RSS operations
- **UI Improvements**: Fixed "Show More Older Articles" button functionality for better news browsing experience

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
- **7-Stage Workflow**: A structured pipeline guiding users from Source Selection, Content Input (RSS feeds with AI scores or custom scripts), AI Analysis (scene breakdown, variants, scoring), Voice Generation, Avatar Selection, Final Export, to optional B-Roll Generation.
- **UI/UX**: Professional, dark-mode first design inspired by Material Design 3, utilizing Shadcn UI components for consistency. Features responsive design, including a mobile-adapted sidebar with a hamburger menu.
- **Enhanced Dashboard**: Rich project cards with visual feedback including:
  - Auto-generated titles from Stage 3 first scene text (50 chars max)
  - Thumbnail previews from HeyGen video generation or Film icon placeholder
  - Color-coded progress bars (red < 25%, yellow 25-75%, green > 75%) with inline RGB styling
  - Smart stats display showing scenes count, duration, and format with icons
  - Status badges and interactive hover effects
- **AI-powered Content Analysis**: Anthropic Claude is used for virality scoring (0-100) of news articles and detailed script analysis, including scene breakdowns and rewrite variants.
- **High-Quality Media Generation**: Integration with ElevenLabs for voice synthesis and HeyGen for AI avatar video generation. Optional B-roll generation is handled by Kie.ai.
- **Robust Data Handling**: All API keys are stored encrypted in the PostgreSQL database. The system features auto-save functionality for generated audio and reliable video generation with auto-resume capabilities, persisting video IDs and statuses to prevent data loss.
- **Project Management**: Includes features for managing projects with Drafts, Completed, and Deleted statuses, progress tracking, and auto-save. Backend enriches project data by extracting metadata from project steps for enhanced dashboard display.
- **Settings Management**: CRUD operations for API keys with encryption and masked display, and management of RSS sources including auto-parsing and topic categorization.
- **Security**: Utilizes Replit Auth for secure authentication and session management. API keys are stored encrypted, not in environment variables.

### Database Schema
- `users`: User accounts.
- `sessions`: Session storage.
- `api_keys`: Encrypted API keys for external services (Anthropic, ElevenLabs, HeyGen, Kie.ai, Apify, OpenAI).
- `rss_sources`: News RSS feed configurations.
- `rss_items`: Parsed news articles with AI scores.
- `instagram_sources`: Instagram accounts for Reels scraping (username, parse_status, item_count, parse_error).
- `instagram_items`: Scraped Instagram Reels with video metadata, engagement metrics, AI scoring, and user tracking.
- `projects`: Video production projects.
- `project_steps`: Step-by-step progress tracking within projects.

## External Dependencies
- **Anthropic Claude**: Used for AI content analysis, news scoring, and script analysis.
- **Apify**: Official `apify/instagram-reel-scraper` actor for Instagram Reels content extraction (Phases 2-5 complete).
- **OpenAI Whisper**: Speech-to-text transcription for Instagram Reels videos (Phase 5).
- **ElevenLabs**: Integrated for high-quality voice generation.
- **HeyGen**: Used for avatar video generation.
- **Kie.ai**: Utilized for optional AI B-roll footage generation per scene.
- **Replit Auth**: Provides authentication services (OpenID Connect).
- **PostgreSQL (Neon)**: The primary database for all project data.