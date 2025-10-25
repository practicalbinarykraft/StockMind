# ReelRepurposer - AI Video Production Pipeline

## Overview
ReelRepurposer is an AI-powered video production pipeline for professional content creators. It automates the transformation of news content and Instagram Reels into engaging short-form videos through a 7-stage workflow. The system provides AI-driven content analysis (including virality scoring), high-quality voiceover generation, and AI avatar video production. Its core purpose is to scale video production, offer smart content insights, and deliver professional-grade video output via a user-friendly interface. The business vision is to empower content creators with AI tools to efficiently produce high-quality, viral video content, tapping into the growing demand for short-form video.

## User Preferences
- **Theme**: Dark mode primary, light mode secondary
- **Design approach**: Professional, production-tool focused (Material Design 3 inspired)
- **Color scheme**: Deep slate backgrounds with vibrant blue primary
- **Typography**: Inter for UI, JetBrains Mono for code/API keys
- **Score visualization**: Color-coded gradient system (green 90-100, teal 70-89, amber 50-69, red below 50)
- **Primary Language**: Russian (UI text, AI prompts, user communication)

## System Architecture

### Core Design Principles
The system emphasizes a multi-agent AI architecture, robust data versioning, and a flexible storage layer. A critical pattern involves the mapping of AI-generated `sceneNumber` (1-indexed) to database `scene.id` for accurate persistence of recommendations.

### UI/UX Decisions
The user interface adheres to a professional, production-tool aesthetic inspired by Material Design 3. It features a dark mode, deep slate backgrounds, vibrant blue accents, and Inter/JetBrains Mono typography. Score visualizations use a color-coded gradient system for intuitive understanding.

### Technical Implementations
-   **Database**: PostgreSQL for rich relations, ACID transactions, and version control, accessed via Drizzle ORM for type safety and migration management.
-   **Storage Layer**: All DB operations are abstracted behind an `IStorage` interface (`server/storage.ts`) for thin routes, testability, and consistent error handling.
-   **Multi-Agent AI**: Specialized AI agents (Hook Expert, Structure Analyst, Emotional Analyst, CTA Expert) analyze scripts and generate scene-specific recommendations with priority, suggested text, reasoning, and expected impact.
-   **API Endpoint Structure**: Endpoints follow a pattern of input validation, data fetching, external service calls, and atomic database updates, returning structured responses.
-   **Frontend Data Fetching**: Utilizes React Query for efficient data management, caching, and state synchronization, with strict rules for query invalidation and optimistic updates.
-   **Drizzle Schema Pattern**: Enforces type safety and consistency across frontend and backend, using `createInsertSchema` and `$inferSelect` for types.

### Feature Specifications
-   **Workflow**: A 7-stage automated pipeline for video production.
-   **Content Sources**: Supports RSS feeds (with Readability integration) and Instagram Reels (via Apify scraping).
-   **Script Versioning**: Non-destructive editing with parent-child relationships between script versions, allowing for history tracking and reverts.
-   **AI Recommendations**: Scene-specific AI suggestions for improving virality, with the ability to apply individual or all recommendations.
-   **API Key Management**: Secure storage of external API keys encrypted with AES-256.

## External Dependencies

-   **Anthropic Claude**: Used for multi-agent AI analysis, script generation, and virality scoring. (User provides API key).
-   **ElevenLabs**: (Optional) For high-quality voiceover generation. (User provides API key).
-   **HeyGen**: (Optional) For AI avatar video generation. (User provides API key).
-   **Apify**: (Optional) For Instagram Reels scraping using the `apify/instagram-reels-scraper` actor. (User provides API key).
-   **Replit Auth**: Pre-configured for user authentication.
-   **PostgreSQL**: Primary database.
-   **Drizzle ORM**: TypeScript ORM for PostgreSQL.
-   **React Query (TanStack Query)**: Frontend data fetching and state management.
-   **Shadcn UI**: UI component library.
-   **Readability**: Used for extracting clean content from RSS articles.
-   **Zod**: Schema validation.

## Recent Changes

### October 25, 2025 - Phase 3: Code Quality & Polish (P2 - COMPLETED ✅)
**Status**: ALL TASKS COMPLETED AND ARCHITECT APPROVED

Completed final code quality improvements, naming standardization, and bug fixes.

**Accomplishments:**
1. **Dead Code Removal (Task 9)** ✅
   - Eliminated 146 lines of duplicate/unused code from routes.ts
   - Migrated remaining logic to service layer
   - Removed unused functions: parseSourceType, createSourcePreview, generateAnalysisPrompt

2. **Naming Conventions Standardization (Task 10)** ✅
   - Renamed 7 files to kebab-case:
     - Server: `fetchAndExtract.ts` → `fetch-and-extract.ts`, `replitAuth.ts` → `replit-auth.ts`
     - Client: `useAuth.ts` → `use-auth.ts`, `authUtils.ts` → `auth-utils.ts`, `queryClient.ts` → `query-client.ts`
   - Updated 20+ import paths across codebase
   - Achieved 100% naming consistency (kebab-case for files, camelCase for code, snake_case for DB)

3. **Integration Testing & Bug Fix (Task 11)** ✅
   - Validated all 7 API endpoints post-refactoring
   - Fixed critical UI bug in history-modal.tsx:
     - **Issue**: Strikethrough text appearing in version preview
     - **Cause**: renderDiff() function showing combined diff in both columns
     - **Fix**: Clean side-by-side display (before/after) without inline diff formatting
   - Removed unused renderDiff() function and diff-match-patch import (-23 lines)

**Code Quality Impact:**
- Total lines removed: ~170 (dead code + bug fix)
- Zero regressions introduced
- Zero LSP errors
- All endpoints validated with real user flow

**Next Steps:**
- Optional: Remove diff-match-patch dependency from package.json (not used anywhere)

---

### October 25, 2025 - Phase 2: Service Layer Implementation (P1 - COMPLETED ✅)
Completed comprehensive refactoring to introduce proper service layer architecture and standardize API responses.

**Service Layer Introduction:**
- Created ProjectService and ScriptVersionService to encapsulate business logic
- All routes now delegate to service layer (thin controller pattern)
- Services handle validation, orchestration, and error handling
- Atomic operations with proper transaction boundaries

**API Response Standardization:**
- All endpoints now return: `{ success: true, data: {...} }` for success
- Error responses: `{ success: false, error: { message, code, details } }`
- Consistent error handling across 7 endpoints
- Frontend updated to unwrap new response format

---

### October 25, 2025 - Phase 1: Database & Architecture Fixes (P0 - COMPLETED ✅)
Fixed critical database transaction issues and N+1 query problems.

**Database Fixes:**
- Eliminated N+1 queries in project/script-history endpoints
- Fixed duplicate version creation bug (apply-scene-recommendation)
- Proper transaction management with rollback on errors
- Atomic operations for version creation + recommendation updates