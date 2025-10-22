# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is a comprehensive AI-powered video production pipeline designed for professional content creators to efficiently transform news content into engaging short-form videos. It automates the video production process from source selection to final export through a 7-stage workflow, featuring AI-driven content analysis, high-quality voiceover generation (ElevenLabs), and avatar video production (HeyGen). The project aims to scale video production, provide smart content analysis with virality scoring, and deliver professional-grade video output through a user-friendly interface.

## Recent Updates

### October 22, 2025
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
- `api_keys`: Encrypted API keys for external services (Anthropic, ElevenLabs, HeyGen, Kie.ai, **Apify**).
- `rss_sources`: News RSS feed configurations.
- `rss_items`: Parsed news articles with AI scores.
- `instagram_sources`: Instagram accounts for Reels scraping (username, parse_status, item_count, parse_error).
- `projects`: Video production projects.
- `project_steps`: Step-by-step progress tracking within projects.

## External Dependencies
- **Anthropic Claude**: Used for AI content analysis, news scoring, and script analysis.
- **Apify**: Official `apify/instagram-reel-scraper` actor for Instagram Reels content extraction (Phase 2 complete).
- **ElevenLabs**: Integrated for high-quality voice generation.
- **HeyGen**: Used for avatar video generation.
- **Kie.ai**: Utilized for optional AI B-roll footage generation per scene.
- **Replit Auth**: Provides authentication services (OpenID Connect).
- **PostgreSQL (Neon)**: The primary database for all project data.