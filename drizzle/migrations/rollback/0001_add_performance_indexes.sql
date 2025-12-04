-- Rollback: Performance Indexes Migration
-- Removes all performance indexes added in 0001_add_performance_indexes.sql

-- Projects indexes
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_updated_at;
DROP INDEX IF EXISTS idx_projects_user_status;

-- Project steps indexes
DROP INDEX IF EXISTS idx_project_steps_project_id;
DROP INDEX IF EXISTS idx_project_steps_project_step;

-- API keys indexes
DROP INDEX IF EXISTS idx_api_keys_user_id;
DROP INDEX IF EXISTS idx_api_keys_provider;
DROP INDEX IF EXISTS idx_api_keys_user_provider;

-- Script versions indexes
DROP INDEX IF EXISTS idx_script_versions_project_id;
DROP INDEX IF EXISTS idx_script_versions_version_number;
DROP INDEX IF EXISTS idx_script_versions_candidate;

-- RSS indexes
DROP INDEX IF EXISTS idx_rss_sources_user_id;
DROP INDEX IF EXISTS idx_rss_items_user_id;
DROP INDEX IF EXISTS idx_rss_items_source_id;
DROP INDEX IF EXISTS idx_rss_items_published_at;
DROP INDEX IF EXISTS idx_rss_items_user_unused;

-- Instagram indexes
DROP INDEX IF EXISTS idx_instagram_sources_user_id;
DROP INDEX IF EXISTS idx_instagram_items_user_id;
DROP INDEX IF EXISTS idx_instagram_items_source_id;
DROP INDEX IF EXISTS idx_instagram_items_taken_at;
DROP INDEX IF EXISTS idx_instagram_items_user_unused;

-- Instagram Graph API indexes
DROP INDEX IF EXISTS idx_ig_accounts_user_id;
DROP INDEX IF EXISTS idx_ig_media_account_id;
DROP INDEX IF EXISTS idx_ig_media_timestamp;
DROP INDEX IF EXISTS idx_ig_media_insights_media_id;

-- Scene recommendations indexes
DROP INDEX IF EXISTS idx_scene_recommendations_version_id;

-- Project version bindings indexes
DROP INDEX IF EXISTS idx_project_version_bindings_project_id;
DROP INDEX IF EXISTS idx_project_version_bindings_current;

-- Sessions indexes
DROP INDEX IF EXISTS idx_sessions_sid;
DROP INDEX IF EXISTS idx_sessions_expire;
