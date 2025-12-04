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
  private readonly JOB_TIMEOUT_MS = 120000; // 120 seconds (2 minutes)
  private idempotencyMap: Map<string, string> = new Map(); // idempotencyKey -> jobId
  
  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAYS_MS = [1000, 3000, 7000]; // Exponential backoff: 1s, 3s, 7s

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
        currentJob.error = 'Пересчёт занял слишком долго (>2 минут). Попробуйте снова или отмените черновик.';
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

  /**
   * Executes an async function with retry logic and exponential backoff
   * @param fn Function to execute
   * @param retryOn Function to determine if error should trigger retry (default: check for 429/5xx)
   * @returns Result of fn
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retryOn?: (error: any) => boolean
  ): Promise<T> {
    const shouldRetry = retryOn || ((error: any) => {
      // Retry on rate limits (429) or server errors (5xx)
      const status = error?.status || error?.response?.status;
      return status === 429 || (status >= 500 && status < 600);
    });

    let lastError: any;
    
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry if this is the last attempt or error is not retryable
        if (attempt >= this.MAX_RETRIES || !shouldRetry(error)) {
          throw error;
        }
        
        const delayMs = this.RETRY_DELAYS_MS[attempt] || this.RETRY_DELAYS_MS[this.RETRY_DELAYS_MS.length - 1];
        
        // Structured logging: retry attempt
        console.log(`[reanalyze.retry]`, {
          attempt: attempt + 1,
          maxRetries: this.MAX_RETRIES,
          delayMs,
          errorStatus: lastError?.status || lastError?.response?.status,
          timestamp: new Date().toISOString()
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw lastError;
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
