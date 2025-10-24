# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is an AI-powered video production pipeline for professional content creators. It automates the transformation of news content and Instagram Reels into engaging short-form videos through a 7-stage workflow. Key capabilities include AI-driven content analysis with virality scoring, high-quality voiceover generation, and AI avatar video production. The project aims to scale video production, provide smart content insights, and deliver professional-grade video output via a user-friendly interface.

## User Preferences
- **Theme**: Dark mode primary, light mode secondary
- **Design approach**: Professional, production-tool focused (Material Design 3 inspired)
- **Color scheme**: Deep slate backgrounds with vibrant blue primary
- **Typography**: Inter for UI, JetBrains Mono for code/API keys
- **Score visualization**: Color-coded gradient system (green 90-100, teal 70-89, amber 50-69, red below 50)

## System Architecture

### Core Features & Design
- **7-Stage Workflow**: A structured pipeline from source selection (RSS feeds, custom scripts, Instagram Reels) to content input, AI analysis (scene breakdown, variants, scoring), voice generation, avatar selection, final export, and optional B-Roll Generation.
- **UI/UX**: Professional, dark-mode first design inspired by Material Design 3, utilizing Shadcn UI components for consistency and responsive design. Features an enhanced dashboard with rich project cards displaying auto-generated titles, previews, progress bars, and smart statistics.
- **AI-powered Content Analysis**: Employs a multi-agent AI system (Hook Expert, Structure Analyst, Emotional Analyst, CTA Analyst, Architect) for comprehensive virality scoring, detailed script analysis, scene breakdowns, rewrite variants, and actionable recommendations.
- **High-Quality Media Generation**: Integrates services for voice synthesis (ElevenLabs), AI avatar video generation (HeyGen), and optional B-roll generation (Kie.ai).
- **Robust Data Handling & Security**: API keys are stored encrypted. The system features auto-save for generated audio, reliable video generation with auto-resume, and secure authentication via Replit Auth. Instagram Reels include automatic download, transcription, and AI scoring. Project data is managed with Drafts, Completed, and Deleted statuses, progress tracking, and auto-save, with backend metadata enrichment. API key management includes CRUD operations, encryption, masked display, and testing.
- **Interactive Scene-by-Scene Recommendation System**: Provides version control for scripts with parent-child relationships. AI recommendations are mapped to specific scenes, allowing users to apply individual or bulk suggestions, manually edit scenes with version tracking, and revert to previous versions non-destructively.

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

### Database Schema
- `users`, `sessions`, `api_keys`, `rss_sources`, `rss_items`, `instagram_sources`, `instagram_items`, `projects`, `project_steps`, `script_versions`, `scene_recommendations`.

## Recent Changes (October 24, 2025)

### Enhanced Recommendation System - AI Agent Tracking & Smart Sorting

**Database Enhancements (`shared/schema.ts`):**
- ✅ **scene_recommendations table enhanced**: Added 3 new fields for better UX and insights
  - `sourceAgent` (varchar 20): Tracks which AI agent generated recommendation (hook/structure/emotional/cta/general)
  - `scoreDelta` (integer): Expected score boost (0-100), extracted from expectedImpact
  - `confidence` (real): AI confidence level (0-1), mapped from priority

**Backend Intelligence (`server/routes.ts`):**
- ✅ **extractScoreDelta()**: Parses numeric boost from impact strings ("+18 points" → 18, "+35%" → 35)
- ✅ **priorityToConfidence()**: Maps priority to confidence scores (critical=0.95, high=0.85, medium=0.7, low=0.5)
- ✅ **Smart Apply All sorting**: Recommendations now applied in optimal order:
  1. Priority (critical > high > medium > low)
  2. Score Delta (higher impact first)
  3. Confidence (more certain recommendations first)

**Frontend UX Improvements (`client/src/components/project/scene-card.tsx`):**
- ✅ **Source Agent badges**: Visual indicators showing which AI specialist made each recommendation:
  - Sparkles icon: Hook Expert
  - Layers icon: Structure Analyst
  - Heart icon: Emotional Analyst
  - Target icon: CTA Analyst
  - Bot icon: General AI
- ✅ **Score Delta badges**: Green "+X" badges showing expected score boost for high-impact recommendations
- ✅ **Guideline compliance**: All badges use lucide-react icons (no emoji) following project design guidelines

**Impact**: Users can now see which AI agent made each recommendation, understand expected score improvements, and trust that "Apply All" applies recommendations in the most effective order. Provides transparency into the multi-agent AI system and helps users prioritize manual review of high-impact suggestions.

### Production-Grade Version Control & Provenance Tracking

**Database Schema (`shared/schema.ts`):**
- ✅ **Provenance tracking**: Added `provenance` JSONB field to `script_versions` table capturing:
  - `source`: Type of change (ai_recommendation, manual_edit, bulk_apply, revert)
  - `agentType`: AI agent responsible (if applicable)
  - `userId`: User who made the change
  - `timestamp`: When change occurred
  - `recommendationIds`: Array of applied recommendations (for bulk operations)
- ✅ **Diff visualization**: Added `diff` JSONB field storing before/after snapshots per scene for visual comparison
- ✅ **Performance indexes**: Unique constraint on current versions, DESC ordering for history queries, optimized recommendation filtering

**Backend Intelligence (`server/routes.ts`):**
- ✅ **Auto-diff calculation**: `createNewScriptVersion()` helper automatically compares current vs previous version, identifying added/removed/modified scenes
- ✅ **Provenance auto-population**: All mutation endpoints (apply, apply-all, edit, revert) automatically track source, agent, user, and timestamp
- ✅ **Transaction safety**: Apply All wrapped in transaction with `SELECT FOR UPDATE` to prevent race conditions

**Frontend History Modal (`history-modal.tsx`):**
- ✅ **Split-view diff display**: Shows before/after changes side-by-side using diff-match-patch library
- ✅ **Word-level highlighting**: Green additions, red deletions, inline diff visualization
- ✅ **Provenance badges**: Visual indicators showing change source (AI Recommendation, Manual Edit, Bulk Apply, Revert)
- ✅ **Graceful fallback**: Simple preview when diff data unavailable (backward compatibility)

**Race Protection (`scene-card.tsx`, `scene-editor.tsx`):**
- ✅ **Mutual exclusion**: Apply All disables individual Apply buttons, individual Apply disables Apply All
- ✅ **Clear feedback**: Status text shows "Применяем все..." or "Применяем рекомендацию..." during operations
- ✅ **Prevents double-submit**: Disabled states prevent concurrent mutations and data corruption

**Impact**: Users get complete audit trail of all script changes, can visualize exactly what changed between versions, understand who/what made each modification, and confidently use Apply/Apply All operations without risk of race conditions. Production-ready version control system with non-destructive infinite undo and full change transparency.

## External Dependencies
- **Anthropic Claude**: AI content analysis, virality scoring, script analysis, multi-agent system.
- **Apify**: `apify/instagram-reels-scraper` for Instagram Reels content extraction.
- **OpenAI Whisper**: Speech-to-text transcription for Instagram Reels.
- **ElevenLabs**: High-quality voice generation.
- **HeyGen**: Avatar video generation.
- **Kie.ai**: Optional AI B-roll footage generation.
- **Replit Auth**: Authentication services.
- **PostgreSQL (Neon)**: Primary database.