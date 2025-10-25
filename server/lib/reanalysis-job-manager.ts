import { randomUUID } from 'crypto';

export type JobStatus = 'pending' | 'running' | 'done' | 'error';

export interface ReanalysisJob {
  jobId: string;
  projectId: string;
  status: JobStatus;
  candidateVersionId?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

class ReanalysisJobManager {
  private jobs: Map<string, ReanalysisJob> = new Map();
  private readonly JOB_TIMEOUT_MS = 70000; // 70 seconds

  createJob(projectId: string): ReanalysisJob {
    // Check if there's already a running job for this project
    for (const job of Array.from(this.jobs.values())) {
      if (job.projectId === projectId && (job.status === 'pending' || job.status === 'running')) {
        throw new Error('ALREADY_RUNNING');
      }
    }

    const jobId = randomUUID();
    const job: ReanalysisJob = {
      jobId,
      projectId,
      status: 'pending',
      startedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Auto-timeout
    setTimeout(() => {
      const currentJob = this.jobs.get(jobId);
      if (currentJob && (currentJob.status === 'pending' || currentJob.status === 'running')) {
        currentJob.status = 'error';
        currentJob.error = 'Reanalysis timed out';
        currentJob.completedAt = new Date();
      }
    }, this.JOB_TIMEOUT_MS);

    return job;
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
    }
    if (status === 'done' || status === 'error') {
      job.completedAt = new Date();
    }
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
