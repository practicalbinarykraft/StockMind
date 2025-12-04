# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is an AI-powered video production pipeline designed for professional content creators. It automates the transformation of news content and Instagram Reels into engaging short-form videos through a 7-stage workflow. The system provides AI-driven content analysis, including virality scoring, high-quality voiceover generation, and AI avatar video production. Its core purpose is to scale video production, offer smart content insights, and deliver professional-grade video output via a user-friendly interface. The business vision is to empower content creators with AI tools to efficiently produce high-quality, viral video content, addressing the growing demand for short-form video.

## User Preferences
-   **Theme**: Dark mode primary, light mode secondary
-   **Design approach**: Professional, production-tool focused (Material Design 3 inspired)
-   **Color scheme**: Deep slate backgrounds with vibrant blue primary
-   **Typography**: Inter for UI, JetBrains Mono for code/API keys
-   **Score visualization**: Color-coded gradient system (green 90-100, teal 70-89, amber 50-69, red below 50)
-   **Primary Language**: Russian (UI text, AI prompts, user communication)

## System Architecture

### Core Design Principles
The system employs a multi-agent AI architecture, robust data versioning, and a flexible storage layer. A key pattern involves mapping AI-generated `sceneNumber` (1-indexed) to database `scene.id` for accurate persistence of recommendations.

### UI/UX Decisions
The user interface adheres to a professional, production-tool aesthetic inspired by Material Design 3, featuring a dark mode, deep slate backgrounds, vibrant blue accents, and Inter/JetBrains Mono typography. Score visualizations use a color-coded gradient system for intuitive understanding.

### Technical Implementations
-   **Database**: PostgreSQL for rich relations, ACID transactions, and version control, accessed via Drizzle ORM for type safety and migration management.
-   **Storage Layer**: All database operations are abstracted behind an `IStorage` interface (`server/storage.ts`) for thin routes, testability, and consistent error handling.
-   **Multi-Agent AI**: Specialized AI agents (Hook Expert, Structure Analyst, Emotional Analyst, CTA Expert) analyze scripts and generate scene-specific recommendations.
-   **API Endpoint Structure**: Endpoints follow a pattern of input validation, data fetching, external service calls, and atomic database updates, returning structured responses.
-   **Frontend Data Fetching**: Utilizes React Query for efficient data management, caching, and state synchronization.
-   **Drizzle Schema Pattern**: Enforces type safety and consistency across frontend and backend.
-   **Candidate Version Model**: Implements "candidate → compare → accept" workflow where edits create a candidate version (`is_candidate=true`) that is analyzed, compared with current version, then explicitly accepted (becomes `is_current=true`) or rejected. Editor displays candidate when available (`candidate ?? current`), cache invalidates immediately after candidate creation (not waiting for analysis), and UI banner provides Compare/Accept/Reject actions.
-   **Score Calculation Fix (Oct 26, 2025)**: Fixed critical bug where `structureScore`, `emotionalScore`, `ctaScore` were incorrectly extracted from nested `breakdown` paths instead of top-level `analysisResult` fields matching Claude API response structure. Fixed in 3 locations in `routes.ts` (lines ~3487, ~3772, ~3980).
-   **Version Comparison**: Explicit version IDs in comparison endpoint prevent stale data; delta computation short-circuits to null during running analyses to avoid misleading values; UI shows skeleton states for metrics and em dashes for deltas until analysis completes.
-   **Instagram Analytics Architecture**: 
    - **Security**: Dual encryption system - legacy API keys use `storage.ts encryptApiKey/decryptApiKey` (AES-256-CBC with random IV), Instagram tokens use `server/encryption.ts` (scrypt-derived key derivation with fixed IV). OAuth callback, sync service, and all routes consistently use encryption.ts for Instagram tokens.
    - **Sync Service**: Intelligent scheduling (hourly for first 48h post-publish → daily thereafter), exponential backoff (1min → 2min → 5min → 10min → 30min on errors), per-media tracking of nextSyncAt timestamps.
    - **Database Schema**: Composite unique constraint `(igAccountId, igMediaId)` prevents cross-user overwrites, all routes validate ownership before mutations.
    - **Token Management**: Long-Lived Tokens (60-day expiry) with automatic refresh 14 days before expiration, token status badges (valid/expiring_soon/expired) in UI.
    - **Frontend Components**: AccountConnection (OAuth flow), MediaList (Reels browser with sync controls), VersionComparison (predicted vs actual metrics with delta badges), AIRecommendations (context-aware advice based on performance gaps).

### Feature Specifications
-   **Workflow**: An 8-stage automated pipeline for video production and performance analytics.
-   **Content Sources**: Supports RSS feeds (with Readability integration) and Instagram Reels (via Apify scraping).
-   **Script Versioning**: Non-destructive editing with parent-child relationships, allowing history tracking and reverts.
-   **AI Recommendations**: Scene-specific AI suggestions for improving virality, with options to apply individual or all recommendations.
-   **API Key Management**: Secure storage of external API keys, encrypted with AES-256.
-   **Instagram Analytics (Stage 8)**: Full-featured performance tracking system connecting AI predictions with real Instagram metrics, featuring OAuth2 integration, automatic sync scheduling, and AI-powered recommendations.

## External Dependencies

-   **Anthropic Claude**: Used for multi-agent AI analysis, script generation, and virality scoring.
-   **ElevenLabs**: (Optional) For high-quality voiceover generation.
-   **HeyGen**: (Optional) For AI avatar video generation.
-   **Apify**: (Optional) For Instagram Reels scraping using the `apify/instagram-reels-scraper` actor.
-   **Replit Auth**: Pre-configured for user authentication.
-   **PostgreSQL**: Primary database.
-   **Drizzle ORM**: TypeScript ORM for PostgreSQL.
-   **React Query (TanStack Query)**: Frontend data fetching and state management.
-   **Shadcn UI**: UI component library.
-   **Readability**: Used for extracting clean content from RSS articles.
-   **Zod**: Schema validation.