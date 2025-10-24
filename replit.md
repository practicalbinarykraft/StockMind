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

### API Keys Security & UX Improvements (Latest)

**Backend Security Enhancements (`server/routes.ts`, `server/storage.ts`, `shared/schema.ts`):**
- ✅ **Safe DTO pattern**: GET/POST `/api/settings/api-keys` now returns `{id, provider, last4, isActive, createdAt, updatedAt}` only - never exposes encryptedKey to client
- ✅ **last4 field**: Added `last4 VARCHAR(4)` to api_keys schema for safe display (••••x7Qz format)
- ✅ **Auto-generation**: `createApiKey()` extracts last 4 chars before encryption and stores separately
- ✅ **Test endpoints**: Added `/api/settings/api-keys/:id/test` supporting all 6 providers (OpenAI, Anthropic, ElevenLabs, HeyGen, Kie.ai, Apify)
- ✅ **Code clarity**: Added explicit `decryptedKey` variable with comment explaining misleading encryptedKey field name

**Frontend Improvements (`client/src/pages/settings.tsx` + 5 other files):**
- ✅ **React best practice**: Fixed render-time redirect bug by moving to useEffect
- ✅ **Removed sensitive display**: Deleted showKey state, Eye/EyeOff icons - keys now display as ••••last4 only
- ✅ **Russian i18n**: Added `locale: ru` to all `formatDistanceToNow()` calls across 6 files (settings, home, instagram-reels, project/new, stage-2-content-input)
- ✅ **Universal test buttons**: Test button now available for ALL providers (was anthropic-only)
- ✅ **Safe fallbacks**: Added validation for undefined API response fields (viralReelsCount with fallback to 0)

**Instagram UX Enhancements (`server/routes.ts`):**
- ✅ **Username normalization**: `normalizeInstagramUsername()` accepts @username, instagram.com/username, trailing slashes - extracts clean username

**Impact**: Eliminates API key leakage to client, improves UX with masked display, adds comprehensive testing for all providers, proper Russian localization.

---

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

---

### Advanced Multi-Agent AI Analysis System - Stage 3 Integration (Latest)

**Multi-Agent Architecture (`server/ai-service-advanced.ts`, `shared/advanced-analysis-types.ts`):**
- ✅ **5-agent system**: Hook Expert, Structure Analyst, Emotional Analyst, CTA Analyst, and Architect synthesizer
- ✅ **Comprehensive type system**: Created `AdvancedScoreResult` with detailed breakdowns for all analysis dimensions
- ✅ **Parallel execution**: All 4 specialist agents run concurrently, results synthesized by Architect
- ✅ **Backward compatibility**: Original `ai-service.ts` untouched, new system in separate module
- ✅ **Model fix**: Corrected claude-opus-4 → claude-sonnet-4-5 for API compatibility

**Hook Expert Analysis:**
- ✅ **5-criteria evaluation**: attentionGrab, clarity, specificity, emotional, patternMatch (each 0-100)
- ✅ **Hook type identification**: question/stat/problem/curiosity/story/command
- ✅ **Improvement variants**: 2-3 rewrite suggestions with expected score boost
- ✅ **Pattern matching**: Identifies viral patterns (shocking-stat, curiosity-gap, personal-story)

**Structure Analyst:**
- ✅ **Pacing analysis**: WPM (words per minute), optimal range 180-220
- ✅ **Information density**: Facts per second, rated sparse/optimal/dense/overwhelming
- ✅ **Scene flow**: Logical progression analysis (problem→solution→CTA)
- ✅ **Retention curve**: Second-by-second retention prediction
- ✅ **Optimal length**: Current vs recommended duration

**Emotional Impact Analyst:**
- ✅ **Primary emotion**: Identifies fear/greed/curiosity/anger/joy/fomo/pride with strength score
- ✅ **Trigger detection**: Pain points, social proof, urgency, scarcity triggers
- ✅ **Relatability score**: How well audience identifies with content (0-100)
- ✅ **Shareability score**: Likelihood of sharing (0-100)

**CTA Analyst:**
- ✅ **Presence detection**: Whether call-to-action exists
- ✅ **Clarity evaluation**: How clear the action is (0-100)
- ✅ **Placement analysis**: beginning/middle/end positioning
- ✅ **Friction score**: How easy action is to complete (0-100)
- ✅ **Urgency detection**: Time-sensitive language presence

**Architect Synthesis:**
- ✅ **Overall assessment**: Composite score + verdict (weak/moderate/strong/viral)
- ✅ **Confidence metric**: 0-1 confidence in analysis
- ✅ **Strengths/Weaknesses**: Clearly separated actionable insights
- ✅ **Prioritized recommendations**: High/medium/low priority with expected impact ("+35% saves")
- ✅ **Viral pattern matching**: What patterns are used vs missing
- ✅ **Metric predictions**: Estimated retention/saves/shares

**Test Endpoints (`server/routes.ts`):**
- ✅ **POST /api/analyze/advanced/news**: Test news article analysis
- ✅ **POST /api/analyze/advanced/reel**: Test Instagram Reel analysis
- ✅ **POST /api/analyze/advanced/script**: Test custom script analysis
- ✅ **POST /api/analyze/compare**: Compare old vs new system side-by-side

**Stage 3 Integration (`client/src/components/project/stages/stage-3-ai-analysis.tsx`, `client/src/components/project/advanced-analysis-display.tsx`):**
- ✅ **Smart endpoint routing**: Automatically calls correct advanced endpoint based on project.sourceType (news → /api/analyze/advanced/news, instagram → /api/analyze/advanced/reel, custom → /api/analyze/advanced/script)
- ✅ **AdvancedAnalysisDisplay component**: Rich UI displaying all breakdowns (Hook, Structure, Emotional, CTA) with color-coded scores, progress bars, strengths/weaknesses, recommendations, viral patterns
- ✅ **Caching system**: Saves advanced analysis results to project steps, loads from cache on revisit
- ✅ **Backward compatibility**: Legacy simple analysis system preserved, can switch between modes
- ✅ **User experience**: Loading state shows multi-agent pipeline progress, cost warning for re-analysis (~$0.08-0.12)

**Impact**: Transforms simple score+comment into comprehensive actionable insights with 10x more value. Trade-off: 4x slower (8-12s vs 2-3s), but provides detailed breakdowns, concrete recommendations with impact predictions, and viral pattern analysis. **Production-ready** - Stage 3 now uses advanced system by default, with proper type safety and architect approval.

## External Dependencies
- **Anthropic Claude**: AI content analysis, news/Reel scoring, script analysis.
- **Apify**: `apify/instagram-reel-scraper` for Instagram Reels content extraction.
- **OpenAI Whisper**: Speech-to-text transcription for Instagram Reels.
- **ElevenLabs**: High-quality voice generation.
- **HeyGen**: Avatar video generation.
- **Kie.ai**: Optional AI B-roll footage generation.
- **Replit Auth**: Authentication services.
- **PostgreSQL (Neon)**: Primary database.