# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is a comprehensive AI-powered video production pipeline designed for professional content creators to efficiently transform news content into engaging short-form videos. It automates the video production process from source selection to final export through a 7-stage workflow, featuring AI-driven content analysis, high-quality voiceover generation (ElevenLabs), and avatar video production (HeyGen). The project aims to scale video production, provide smart content analysis with virality scoring, and deliver professional-grade video output through a user-friendly interface.

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
- **AI-powered Content Analysis**: Anthropic Claude is used for virality scoring (0-100) of news articles and detailed script analysis, including scene breakdowns and rewrite variants.
- **High-Quality Media Generation**: Integration with ElevenLabs for voice synthesis and HeyGen for AI avatar video generation. Optional B-roll generation is handled by Kie.ai.
- **Robust Data Handling**: All API keys are stored encrypted in the PostgreSQL database. The system features auto-save functionality for generated audio and reliable video generation with auto-resume capabilities, persisting video IDs and statuses to prevent data loss.
- **Project Management**: Includes features for managing projects with Drafts, Completed, and Deleted statuses, progress tracking, and auto-save.
- **Settings Management**: CRUD operations for API keys with encryption and masked display, and management of RSS sources including auto-parsing and topic categorization.
- **Security**: Utilizes Replit Auth for secure authentication and session management. API keys are stored encrypted, not in environment variables.

### Database Schema
- `users`: User accounts.
- `sessions`: Session storage.
- `api_keys`: Encrypted API keys for external services.
- `rss_sources`: News RSS feed configurations.
- `rss_items`: Parsed news articles with AI scores.
- `projects`: Video production projects.
- `project_steps`: Step-by-step progress tracking within projects.

## External Dependencies
- **Anthropic Claude**: Used for AI content analysis, news scoring, and script analysis.
- **ElevenLabs**: Integrated for high-quality voice generation.
- **HeyGen**: Used for avatar video generation.
- **Kie.ai**: Utilized for optional AI B-roll footage generation per scene.
- **Replit Auth**: Provides authentication services (OpenID Connect).
- **PostgreSQL (Neon)**: The primary database for all project data.