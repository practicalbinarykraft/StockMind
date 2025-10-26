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

### October 26, 2025 - UX Improvement: Candidate Draft Management (COMPLETED ✅)
**Status**: FULLY IMPLEMENTED

Implemented comprehensive UX improvements for candidate draft management following user's detailed ТЗ.

**What Changed:**
1. **Terminology Update** ✅
   - "Сделать версию для сравнения" → "Создать черновик для сравнения"
   - "Открыть сравнение (ДО/ПОСЛЕ)" → "Сравнение: Текущая vs Черновик"
   - "История изменений" → "Все версии (история)"
   - Buttons: "Оставить ДО" → "Оставить текущую", "Выбрать ПОСЛЕ" → "Принять черновик"

2. **Candidate Status Panel** ✅
   - Three states with badges: Отсутствует | Создаётся | Готов
   - Visual feedback with Loader2/CheckCircle2 icons
   - Contextual help text "Готовим черновик… ~10–60 сек"

3. **Cancel Draft Functionality** ✅
   - New DELETE endpoint: `/api/projects/:id/reanalyze/candidate`
   - Backend: `storage.rejectCandidate()` sets `isCandidate=false`, `isRejected=true`
   - Frontend: "Отменить черновик" button in status panel
   - Schema: Added `isRejected` boolean field to `script_versions` table

4. **Toast Improvements** ✅
   - Creating: "Создаём черновик для сравнения" + "Готовим черновик… ~10–60 сек"
   - Ready: "Черновик готов" + "Теперь можно открыть сравнение"
   - Accepted: "Черновик принят" + "Создана новая версия и назначена текущей"
   - Rejected: "Текущая версия сохранена" + "Черновик отклонён"
   - Cancelled: "Черновик отменён" + "Версия для сравнения удалена"

5. **HistoryModal Enhancement** ✅
   - Title: "Все версии (история)"
   - Added explanatory text differentiating from draft comparison
   - Clarifies three functions: просмотр, diff внутри версии, восстановление

6. **Cache Invalidation** ✅
   - All mutations properly invalidate: script-history, scene-recommendations, reanalyze queries
   - Ensures UI consistency after all actions

**Files Modified:**
- `server/routes.ts` - DELETE endpoint
- `server/storage.ts` - rejectCandidate method
- `shared/schema.ts` - isRejected field
- `client/src/components/project/scene-editor.tsx` - status panel + cancel button
- `client/src/components/project/stages/stage-3-ai-analysis.tsx` - toast updates
- `client/src/components/project/compare-modal.tsx` - title/buttons/toasts
- `client/src/components/project/history-modal.tsx` - title/description

**Acceptance Criteria Met:**
- ✅ AC1: Empty state shows "Черновик для сравнения: отсутствует"
- ✅ AC2: Creating state shows progress, then "Черновик готов" when done
- ✅ AC3: Modal opens with Метрики/Сцены tabs, buttons work
- ✅ AC4: Accepting creates vN+1, modal closes, button disappears
- ✅ AC5: History always accessible, shows v1…vN with restore
- ✅ AC6: Reload preserves job status and candidate state
- ✅ AC7: Clear semantic separation between draft comparison and version history

---

### October 25, 2025 - Async Reanalysis Frontend Integration (COMPLETED ✅)
**Status**: FULLY INTEGRATED IN STAGE 3

Successfully integrated async reanalysis workflow into Stage 3 AI Analysis frontend.

**Integration Accomplishments:**
1. **Modal Replacement** ✅
   - Replaced `ReanalyzeCompareModal` with new `CompareModal` component
   - Updated all imports and component usage throughout Stage 3
   
2. **Async Workflow Implementation** ✅
   - Updated `reanalyzeMutation` to call `/api/projects/:id/reanalyze/start`
   - Implemented 2-second polling mechanism for job status updates
   - Added toast notifications for job lifecycle (start → progress → done/error)
   - Auto-cleanup polling after 60 seconds

3. **New Mutations Added** ✅
   - `fetchCompareDataMutation`: Loads comparison data via `/compare/latest`
   - `chooseMutation`: Handles version selection via `/compare/choose`
   - Proper cache invalidation on version selection

4. **SceneEditor Updates** ✅
   - Added `onOpenCompare` prop to trigger comparison modal
   - Added `hasCandidate` prop to show/hide comparison button
   - Updated both SceneEditor instances in Stage 3 (magic UI + legacy UI)

5. **State Management** ✅
   - Added `compareData`, `reanalyzeJobId` state variables
   - Implemented `hasCandidate` detection from `scriptVersionsQuery`
   - Proper cleanup on modal close and version selection

**Technical Flow:**
- User clicks "Сделать версию для сравнения" → POST /reanalyze/start → jobId returned
- Frontend polls GET /reanalyze/status every 2s until status === 'done'
- User clicks "Открыть сравнение (ДО/ПОСЛЕ)" → GET /compare/latest → CompareModal opens
- User chooses version → POST /compare/choose → cache invalidated → modal closes

**Code Quality:**
- Zero LSP errors
- Zero runtime errors
- All HMR updates successful
- Clean async/await patterns throughout

---

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