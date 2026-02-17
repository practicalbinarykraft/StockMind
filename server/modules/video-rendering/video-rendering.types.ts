// ============================================================================
// VIDEO RENDERING TYPES
// ============================================================================
// Типы и интерфейсы для системы рендеринга видео

export interface RenderVideoRequest {
  scriptId: string;
  userId: string;
  width?: number;
  height?: number;
  fps?: number;
  backgroundColor?: string;
  format?: 'mp4' | 'webm';
  quality?: 'low' | 'medium' | 'high';
}

export interface RenderVideoResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
  progress?: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface RenderJob {
  id: string;
  scriptId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  errorMessage?: string;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  metadata?: {
    width: number;
    height: number;
    fps: number;
    format: string;
    totalScenes: number;
    totalDurationFrames: number;
  };
}
