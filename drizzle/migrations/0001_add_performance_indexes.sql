-- Performance Indexes Migration
-- Adds indexes for frequently queried columns to improve performance

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================

-- Index for finding user's projects (most common query)
CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON projects(user_id);

-- Index for project status queries
CREATE INDEX IF NOT EXISTS idx_projects_status
  ON projects(status);

-- Index for sorting by creation/update date
CREATE INDEX IF NOT EXISTS idx_projects_updated_at
  ON projects(updated_at DESC);

-- Compound index for user's active projects (very common)
CREATE INDEX IF NOT EXISTS idx_projects_user_status
  ON projects(user_id, status);

-- ============================================================================
-- PROJECT STEPS TABLE
-- ============================================================================

-- Index for finding steps by project (every project view)
CREATE INDEX IF NOT EXISTS idx_project_steps_project_id
  ON project_steps(project_id);

-- Compound index for project steps ordered by number
CREATE INDEX IF NOT EXISTS idx_project_steps_project_step
  ON project_steps(project_id, step_number);

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================

-- Index for finding user's API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
  ON api_keys(user_id);

-- Index for finding active keys by provider (AI service requests)
CREATE INDEX IF NOT EXISTS idx_api_keys_provider
  ON api_keys(provider) WHERE is_active = true;

-- Compound index for user's active keys by provider (most common)
CREATE INDEX IF NOT EXISTS idx_api_keys_user_provider
  ON api_keys(user_id, provider, is_active);

-- ============================================================================
-- SCRIPT VERSIONS TABLE
-- ============================================================================

-- Index for finding versions by project
CREATE INDEX IF NOT EXISTS idx_script_versions_project_id
  ON script_versions(project_id);

-- Index for finding by version number
CREATE INDEX IF NOT EXISTS idx_script_versions_version_number
  ON script_versions(project_id, version_number);

-- Index for finding candidate versions
CREATE INDEX IF NOT EXISTS idx_script_versions_candidate
  ON script_versions(project_id) WHERE is_candidate = true;

-- ============================================================================
-- RSS TABLES
-- ============================================================================

-- Index for finding user's RSS sources
CREATE INDEX IF NOT EXISTS idx_rss_sources_user_id
  ON rss_sources(user_id);

-- Index for finding user's RSS items
CREATE INDEX IF NOT EXISTS idx_rss_items_user_id
  ON rss_items(user_id);

-- Index for RSS items by source (feed updates)
CREATE INDEX IF NOT EXISTS idx_rss_items_source_id
  ON rss_items(source_id);

-- Index for RSS items by date (timeline queries)
CREATE INDEX IF NOT EXISTS idx_rss_items_published_at
  ON rss_items(published_at DESC);

-- Compound index for user's unused RSS items
CREATE INDEX IF NOT EXISTS idx_rss_items_user_unused
  ON rss_items(user_id, used_in_project) WHERE used_in_project IS NULL;

-- ============================================================================
-- INSTAGRAM TABLES
-- ============================================================================

-- Index for finding user's Instagram sources
CREATE INDEX IF NOT EXISTS idx_instagram_sources_user_id
  ON instagram_sources(user_id);

-- Index for finding user's Instagram items
CREATE INDEX IF NOT EXISTS idx_instagram_items_user_id
  ON instagram_items(user_id);

-- Index for Instagram items by source
CREATE INDEX IF NOT EXISTS idx_instagram_items_source_id
  ON instagram_items(source_id);

-- Index for Instagram items by date
CREATE INDEX IF NOT EXISTS idx_instagram_items_taken_at
  ON instagram_items(taken_at DESC);

-- Compound index for user's unused Instagram items
CREATE INDEX IF NOT EXISTS idx_instagram_items_user_unused
  ON instagram_items(user_id, used_in_project) WHERE used_in_project IS NULL;

-- ============================================================================
-- INSTAGRAM GRAPH API TABLES
-- ============================================================================

-- Index for finding user's IG accounts
CREATE INDEX IF NOT EXISTS idx_ig_accounts_user_id
  ON ig_accounts(user_id);

-- Index for finding IG media by account
CREATE INDEX IF NOT EXISTS idx_ig_media_account_id
  ON ig_media(ig_account_id);

-- Index for finding IG media by timestamp
CREATE INDEX IF NOT EXISTS idx_ig_media_timestamp
  ON ig_media(timestamp DESC);

-- Index for finding IG insights by media
CREATE INDEX IF NOT EXISTS idx_ig_media_insights_media_id
  ON ig_media_insights(ig_media_id);

-- ============================================================================
-- SCENE RECOMMENDATIONS TABLE
-- ============================================================================

-- Index for finding recommendations by version
CREATE INDEX IF NOT EXISTS idx_scene_recommendations_version_id
  ON scene_recommendations(script_version_id);

-- ============================================================================
-- PROJECT VERSION BINDINGS TABLE
-- ============================================================================

-- Index for finding bindings by project
CREATE INDEX IF NOT EXISTS idx_project_version_bindings_project_id
  ON project_version_bindings(project_id);

-- Index for finding current binding
CREATE INDEX IF NOT EXISTS idx_project_version_bindings_current
  ON project_version_bindings(project_id) WHERE is_current = true;

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

-- Index for finding sessions by SID (session lookups)
CREATE INDEX IF NOT EXISTS idx_sessions_sid
  ON sessions(sid);

-- Index for cleaning expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expire
  ON sessions(expire);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all indexes created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
