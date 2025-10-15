# ReelRepurposer - AI Video Production Pipeline

## Overview
A comprehensive AI-powered video production pipeline that transforms news content into engaging short-form videos with automated analysis, voiceover, and avatar generation. Built for professional content creators who want to scale video production efficiently.

## Purpose & Goals
- **Automate video production**: From news source to final video in 7 structured stages
- **AI-powered content analysis**: Smart RSS parsing with virality scoring (0-100)
- **Professional output**: High-quality voiceovers (ElevenLabs) and avatars (HeyGen)
- **User-friendly workflow**: Clear progression through each production stage

## Current State
**Development Phase:** MVP in Progress
- ✅ Complete database schema defined
- ✅ Beautiful, professional UI components built
- ✅ 7-stage workflow interface completed
- ✅ Settings dashboard for API keys and RSS sources
- ⏳ Backend implementation in progress
- ⏳ Integration and testing pending

## Recent Changes
- **2025-01-15**: Initial project setup and schema design
  - Created comprehensive database schema for users, API keys, RSS sources, news items, projects, and project steps
  - Implemented complete frontend with all UI components and pages
  - Built 7-stage project workflow with sidebar navigation
  - Added settings dashboard for API key and RSS source management
  - Configured design system with Inter and JetBrains Mono fonts

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
