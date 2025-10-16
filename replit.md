# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is a comprehensive AI-powered video production pipeline designed for professional content creators to efficiently transform news content into engaging short-form videos. It automates the video production process from source selection to final export through a 7-stage workflow, featuring AI-driven content analysis, high-quality voiceover generation (ElevenLabs), and avatar video production (HeyGen). The project aims to scale video production, provide smart content analysis with virality scoring, and deliver professional-grade video output through a user-friendly interface.

## Recent Updates (October 16, 2025)
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