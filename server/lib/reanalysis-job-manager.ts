import { randomUUID } from 'crypto';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';
export type JobStep = 'hook' | 'structure' | 'emotional' | 'cta' | 'synthesis' | 'saving';

export interface ReanalysisJob {
  jobId: string;
  projectId: string;
  status: JobStatus;
  step?: JobStep;
  progress: number; // 0-100
  candidateVersionId?: string;
  error?: string;
  canRetry: boolean;
  idempotencyKey?: string;
  baseVersionId?: string;
  scenesCount?: number;
  startedAt: Date;
  completedAt?: Date;
}

class ReanalysisJobManager {
  private jobs: Map<string, ReanalysisJob> = new Map();
  private readonly JOB_TIMEOUT_MS = 70000; // 70 seconds
  private idempotencyMap: Map<string, string> = new Map(); // idempotencyKey -> jobId

  createJob(projectId: string, idempotencyKey?: string): ReanalysisJob {
    // Check idempotency - return existing job if same key
    if (idempotencyKey) {
      const existingJobId = this.idempotencyMap.get(idempotencyKey);
      if (existingJobId) {
        const existingJob = this.jobs.get(existingJobId);
        if (existingJob) {
          console.log(`[JobManager] Idempotency hit: returning existing job ${existingJobId}`);
          return existingJob;
        }
      }
    }

    // Check if there's already a running job for this project
    const runningJob = this.getRunningJobForProject(projectId);
    if (runningJob) {
      const error = new Error('Job already running for this project');
      (error as any).code = 'ALREADY_RUNNING';
      (error as any).existingJob = runningJob;
      throw error;
    }

    const jobId = randomUUID();
    const job: ReanalysisJob = {
      jobId,
      projectId,
      status: 'queued',
      progress: 0,
      canRetry: true,
      idempotencyKey,
      startedAt: new Date(),
    };

    this.jobs.set(jobId, job);
    if (idempotencyKey) {
      this.idempotencyMap.set(idempotencyKey, jobId);
    }

    console.log(`[JobManager] Job ${jobId} created for project ${projectId}`);

    // Auto-timeout
    setTimeout(() => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob && (currentJob.status === 'queued' || currentJob.status === 'running')) {
        console.log(`[JobManager] Job ${jobId} timed out`);
        currentJob.status = 'error';
        currentJob.error = 'Не удалось завершить за 70 секунд. Попробуйте снова';
        currentJob.canRetry = true;
        currentJob.completedAt = new Date();
      }
    }, this.JOB_TIMEOUT_MS);

    return job;
  }

  getRunningJobForProject(projectId: string): ReanalysisJob | undefined {
    for (const job of Array.from(this.jobs.values())) {
      if (job.projectId === projectId && (job.status === 'queued' || job.status === 'running')) {
        return job;
      }
    }
    return undefined;
  }

  getJob(jobId: string): ReanalysisJob | undefined {
    return this.jobs.get(jobId);
  }

  updateJobStatus(jobId: string, status: JobStatus, candidateVersionId?: string, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = status;
    if (candidateVersionId) {
      job.candidateVersionId = candidateVersionId;
    }
    if (error) {
      job.error = error;
      job.canRetry = !error.includes('authentication') && !error.includes('permission'); // Can't retry auth errors
    }
    if (status === 'done' || status === 'error') {
      job.completedAt = new Date();
    }
  }

  updateJobProgress(jobId: string, step: JobStep, progress: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.step = step;
    job.progress = Math.min(100, Math.max(0, progress));
    console.log(`[JobManager] Job ${jobId} progress: ${step} ${job.progress}%`);
  }

  setJobMetadata(jobId: string, baseVersionId: string, scenesCount: number): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.baseVersionId = baseVersionId;
    job.scenesCount = scenesCount;
  }

  // Clean up old jobs (called periodically)
  cleanup(maxAgeMs: number = 10 * 60 * 1000): void {
    const now = Date.now();
    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      if (job.completedAt && now - job.completedAt.getTime() > maxAgeMs) {
        this.jobs.delete(jobId);
      }
    }
  }
}

export const jobManager = new ReanalysisJobManager();

// Periodic cleanup every 5 minutes
setInterval(() => {
  jobManager.cleanup();
}, 5 * 60 * 1000);
