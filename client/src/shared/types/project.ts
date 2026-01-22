// Re-export project types from shared schema
export type { 
  Project, 
  InsertProject,
  ProjectStep,
  InsertProjectStep 
} from '@shared/schema';

// Client-specific project types
export type ProjectStatus = 'draft' | 'completed' | 'deleted';
export type SourceType = 'news' | 'custom' | 'instagram' | 'youtube' | 'audio';
