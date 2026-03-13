import type { Request, Response } from 'express';
import { renderReelSchema } from './render.dto';
import { renderReel } from './render.service';
import { logger } from '../../lib/logger';
import { getUserId } from '../../utils/route-helpers';
import { db } from '../../db';
import { projectSteps, projects } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import type { ReelInputProps, ReelScene } from '../../../remotion/types';
import path from 'path';

/**
 * POST /api/render
 * Assembles a final reel video from all project assets using Remotion.
 */
export async function handleRender(req: Request, res: Response) {
  const parsed = renderReelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { projectId, layout, subtitlesEnabled, fps } = parsed.data;
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Verify project ownership
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
      .limit(1);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Fetch all step data
    const steps = await db
      .select()
      .from(projectSteps)
      .where(eq(projectSteps.projectId, projectId));

    const stepMap = new Map(steps.map((s) => [s.stepNumber, s.data as any]));

    const step3 = stepMap.get(3); // Script/scenes
    const step4 = stepMap.get(4); // Voice/audio
    const step5 = stepMap.get(5); // Avatar video
    const step7 = stepMap.get(7); // B-roll (optional)

    // Validate required data
    if (!step4?.audioUrl) {
      return res.status(400).json({ error: 'Audio not generated yet (Stage 4)' });
    }
    if (!step5?.videoUrl) {
      return res.status(400).json({ error: 'Avatar video not generated yet (Stage 5)' });
    }

    const rawScenes = step3?.scenes || step3?.finalScript?.scenes || [];
    const videoDuration = step5?.duration || 30;

    // Build scene list with timecodes
    const scenes: ReelScene[] = rawScenes.map((scene: any, i: number) => {
      const sceneDuration = videoDuration / rawScenes.length;
      const brollScene = step7?.brollScenes?.find(
        (b: any) => b.sceneId === scene.id && b.status === 'completed',
      );

      return {
        id: scene.id || `scene-${i}`,
        text: scene.text || '',
        type: scene.type || 'body',
        startTime: i * sceneDuration,
        endTime: (i + 1) * sceneDuration,
        duration: sceneDuration,
        score: scene.score,
        brollVideoUrl: brollScene?.videoUrl || undefined,
      };
    });

    // Auto-detect layout if not specified
    const hasBroll = scenes.some((s) => s.brollVideoUrl);
    const effectiveLayout = layout || (hasBroll ? 'broll-with-pip' : 'avatar-only');

    const inputProps: ReelInputProps = {
      avatarVideoUrl: step5.videoUrl,
      audioUrl: step4.audioUrl,
      durationInSeconds: videoDuration,
      scenes,
      fullScript: step4.finalScript || '',
      subtitlesEnabled,
      layout: effectiveLayout,
      fps,
      width: 1080,
      height: 1920,
    };

    logger.info(`[render] Starting render for project ${projectId}`, {
      scenes: scenes.length,
      duration: videoDuration,
      layout: effectiveLayout,
      hasBroll,
    });

    const result = await renderReel(projectId, inputProps);

    // Return download URL
    const filename = path.basename(result.outputPath);
    return res.json({
      success: true,
      downloadUrl: `/api/render/download/${filename}`,
      durationInSeconds: result.durationInSeconds,
    });
  } catch (err: any) {
    logger.error('[render] Render failed', err);
    return res.status(500).json({ error: err.message || 'Render failed' });
  }
}

/**
 * GET /api/render/download/:filename
 * Serves the rendered video file.
 */
export async function handleDownload(req: Request, res: Response) {
  const { filename } = req.params;

  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.resolve(process.cwd(), 'uploads/renders', filename);

  try {
    await import('fs').then((fs) => fs.promises.access(filePath));
  } catch {
    return res.status(404).json({ error: 'File not found' });
  }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.sendFile(filePath);
}
