# ReelRepurposer - AI Video Production Pipeline

## Overview
A comprehensive AI-powered video production pipeline that transforms news content into engaging short-form videos with automated analysis, voiceover, and avatar generation. Built for professional content creators who want to scale video production efficiently.

## Purpose & Goals
- **Automate video production**: From news source to final video in 7 structured stages
- **AI-powered content analysis**: Smart RSS parsing with virality scoring (0-100)
- **Professional output**: High-quality voiceovers (ElevenLabs) and avatars (HeyGen)
- **User-friendly workflow**: Clear progression through each production stage

## Current State
**Development Phase:** Core MVP Complete - Stages 1-6 Fully Functional
- ✅ Complete auth system with Replit Auth
- ✅ Full backend API with encrypted API key storage
- ✅ RSS parsing with background AI scoring (Anthropic)
- ✅ Stages 1-6 fully functional with real AI integrations:
  - Stage 1: Source Selection (News/Custom Script)
  - Stage 2: Content Input (RSS feed with AI scores)
  - Stage 3: AI Analysis (Anthropic - scene breakdown, variants, scoring)
  - Stage 4: Voice Generation (ElevenLabs - preview, selection, audio generation)
  - Stage 5: Avatar Selection (HeyGen - preview, video generation, progress tracking)
  - Stage 6: Final Export (video display, download, share, project completion)
- ⏳ Stage 7 Storyboard (Kie.ai B-roll) - optional feature
- ⏳ Instagram/YouTube parsing - additional source types

## Recent Changes
- **2025-10-15 (Latest)**: Fixed Critical Stage 4 Audio Storage Bug
  - ✅ FIXED Error 413 "request entity too large" when saving generated audio
  - Root cause: 5MB base64 audio saved directly in database via JSON
  - Solution: Auto-upload generated audio to `/api/audio/upload`, save only URL in database
  - Generate flow: base64 → Blob → File → server upload → store audioUrl (not audioData)
  - Updated restoration logic to load from audioUrl for both generate and upload modes
  - Audio preview/download works with both server URLs and base64 (backward compatibility)
  - Continue button validates serverAudioUrl presence

- **2025-10-15 (Earlier)**: Enhanced Stage 4 Voice Generation
  - ✅ Fixed Stage 4 data restoration bug - separated Stage 3 analysis data from Stage 4 saved data
  - ✅ Added voice grouping: "My Voices" (custom) and "Public Voices" (ElevenLabs library)
  - ✅ Dual-mode interface: "Generate Voice" (AI) and "Upload Audio" (manual file upload)
  - ✅ Voice selection UI with icons, counts, preview buttons, and proper categorization
  - Fixed TanStack Query undefined data error with proper null coalescing
  - Script auto-loads from Stage 3 analysis for new projects
  - Upload mode with drag & drop, audio preview, and server storage

- **2025-10-15 (Earlier)**: Completed full MVP pipeline (Stages 1-6)
  - ✅ Stage 4: ElevenLabs voice generation with preview playback and audio download
  - ✅ Stage 5: HeyGen avatar video generation with real-time progress polling
  - ✅ Stage 6: Final export with video display, download, share, and project completion
  - Fixed polling interval cleanup to prevent infinite loops
  - Stage 5 saves video metadata to stepData for Stage 6 retrieval
  - All integrations use user-provided API keys (Anthropic, ElevenLabs, HeyGen)
  - Proper error handling and loading states throughout

- **2025-10-15 (Earlier)**: Completed AI integrations for Stages 1-3
  - Implemented Anthropic AI integration for RSS news scoring (0-100 virality scores)
  - Added AI script analysis endpoint for Stage 3 (scene breakdown, variants, scoring)
  - Backend retrieves user's encrypted API keys from database (no env vars)
  - Fixed all auth flow issues and project creation bugs
  - RSS sources auto-parse and trigger background AI scoring
  - Stage 1-3 workflow fully operational

## User Preferences
- **Theme**: Dark mode primary, light mode secondary
- **Design approach**: Professional, production-tool focused (Material Design 3 inspired)
- **Color scheme**: Deep slate backgrounds with vibrant blue primary
- **Typography**: Inter for UI, JetBrains Mono for code/API keys
- **Score visualization**: Color-coded gradient system (green 90-100, teal 70-89, amber 50-69, red below 50)

## Project Architecture

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

**External Services (User-provided API keys):**
- Anthropic Claude: Content analysis and AI scoring
- ElevenLabs: Voice generation
- HeyGen: Avatar video generation
- Kie.ai: B-roll footage (optional)
- OpenAI: Whisper transcription (future)

### Database Schema

**Core Tables:**
- `users`: User accounts via Replit Auth
- `sessions`: Session storage for authentication
- `api_keys`: Encrypted API keys for external services
- `rss_sources`: News RSS feed configurations
- `rss_items`: Parsed news articles with AI scores
- `projects`: Video production projects
- `project_steps`: Step-by-step progress tracking

### 7-Stage Workflow

1. **Source Selection**: Choose between News or Custom Script
2. **Content Input**: Browse news feed (with filters/scores) OR enter custom text
3. **AI Analysis**: 15 format templates, scene breakdown with scores, 3 rewrite variants per scene
4. **Voice Generation**: Select voice profile, generate with ElevenLabs
5. **Avatar Selection**: Choose from HeyGen avatars (custom or public)
6. **Final Export**: Download video, view summary
7. **Storyboard (Optional)**: Add Kie.ai B-roll footage

### Key Features

**Settings Management:**
- API Keys: CRUD with encryption, masked display, active status
- RSS Sources: Auto-parsing on add, status badges, item counts, topic categorization

**News Feed:**
- AI virality scoring (0-100) automatically applied
- Filtering by topic and search
- Score-based color coding

**Project Management:**
- Three status types: Drafts, Completed, Deleted (7-day recovery)
- Progress tracking through workflow stages
- Auto-save functionality

**Content Analysis:**
- Format template selection (15 options)
- Scene-by-scene breakdown with individual scores
- 3 AI-generated rewrite variants per scene
- Manual editing capability
- Overall script score with AI commentary

## Security & Best Practices
- All API keys stored encrypted in database (not in environment variables)
- User-managed credentials via Settings UI
- Replit Auth for authentication (supports Google, GitHub, X, Apple, email/password)
- Session-based auth with database storage
- Protected routes with unauthorized error handling

## Development Notes

**Design System:**
- Follow `design_guidelines.md` religiously for visual consistency
- Use Shadcn components exclusively (avoid custom reimplementations)
- Maintain color contrast and accessibility standards
- Implement beautiful loading, error, and empty states
- Ensure responsive design across all breakpoints

**API Integration Points:**
- RSS parsing with `rss-parser` package
- Anthropic Claude for news scoring and script analysis
- ElevenLabs for voice synthesis
- HeyGen for avatar video rendering
- Kie.ai for optional B-roll generation

**Future Enhancements:**
- Instagram content parsing
- YouTube content extraction
- Audio file transcription with Whisper
- Real-time collaboration features
- Advanced analytics dashboard
