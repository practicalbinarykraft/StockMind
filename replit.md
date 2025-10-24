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

## External Dependencies
- **Anthropic Claude**: AI content analysis, virality scoring, script analysis, multi-agent system.
- **Apify**: `apify/instagram-reels-scraper` for Instagram Reels content extraction.
- **OpenAI Whisper**: Speech-to-text transcription for Instagram Reels.
- **ElevenLabs**: High-quality voice generation.
- **HeyGen**: Avatar video generation.
- **Kie.ai**: Optional AI B-roll footage generation.
- **Replit Auth**: Authentication services.
- **PostgreSQL (Neon)**: Primary database.