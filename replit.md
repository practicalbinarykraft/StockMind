# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is an AI-powered video production pipeline designed for professional content creators. It automates the transformation of news content and Instagram Reels into engaging short-form videos through a 7-stage workflow. The system provides AI-driven content analysis, including virality scoring, high-quality voiceover generation, and AI avatar video production. Its core purpose is to scale video production, offer smart content insights, and deliver professional-grade video output via a user-friendly interface. The project aims to enhance efficiency and creativity in content creation.

## User Preferences
- **Theme**: Dark mode primary, light mode secondary
- **Design approach**: Professional, production-tool focused (Material Design 3 inspired)
- **Color scheme**: Deep slate backgrounds with vibrant blue primary
- **Typography**: Inter for UI, JetBrains Mono for code/API keys
- **Score visualization**: Color-coded gradient system (green 90-100, teal 70-89, amber 50-69, red below 50)

## System Architecture

### Core Features & Design
- **7-Stage Workflow**: A structured pipeline covering source selection (RSS, custom scripts, Instagram Reels), content input, AI analysis (scene breakdown, variants, scoring), voice generation, avatar selection, final export, and optional B-Roll Generation.
- **UI/UX**: Professional, dark-mode first design using Shadcn UI components and Tailwind CSS for consistency and responsiveness. Features an enhanced dashboard with project cards displaying auto-generated titles, previews, progress, and smart statistics.
- **AI-powered Content Analysis**: Utilizes a multi-agent AI system (Hook Expert, Structure Analyst, Emotional Analyst, CTA Analyst, Architect) for comprehensive virality scoring, detailed script analysis, scene breakdowns, rewrite variants, and actionable recommendations. Includes advanced source analysis before script generation, providing users with insights and format recommendations based on content.
- **High-Quality Media Generation**: Integrates services for voice synthesis, AI avatar video generation, and optional B-roll generation.
- **Robust Data Handling & Security**: API keys are encrypted. The system supports auto-save for generated audio, reliable video generation with auto-resume, and secure authentication via Replit Auth. Instagram Reels include automatic download, transcription, and AI scoring. Project data is managed with Drafts, Completed, and Deleted statuses, progress tracking, and auto-save, with backend metadata enrichment.
- **Interactive Scene-by-Scene Recommendation System**: Provides version control for scripts with parent-child relationships. AI recommendations are mapped to specific scenes, allowing users to apply individual or bulk suggestions, manually edit scenes with version tracking, and revert to previous versions non-destructively. This system includes provenance tracking for all script changes, showing which AI agent or user made modifications.
- **Full Article Content Extraction**: Integrates `@mozilla/readability` for extracting full article content from RSS feeds, improving AI analysis quality. It includes smart caching, paywall detection, and graceful fallback to RSS snippets if full extraction fails.

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

## External Dependencies
- **Anthropic Claude**: AI content analysis, virality scoring, script analysis, multi-agent system.
- **Apify**: `apify/instagram-reels-scraper` for Instagram Reels content extraction.
- **OpenAI Whisper**: Speech-to-text transcription for Instagram Reels.
- **ElevenLabs**: High-quality voice generation.
- **HeyGen**: Avatar video generation.
- **Kie.ai**: Optional AI B-roll footage generation.
- **Replit Auth**: Authentication services.
- **PostgreSQL (Neon)**: Primary database.
- **@mozilla/readability**: Article content extraction.