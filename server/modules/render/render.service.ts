import path from 'path';
import fs from 'fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, getCompositions } from '@remotion/renderer';
import { logger } from '../../lib/logger';
import type { ReelInputProps } from '../../../remotion/types';

// Cache the bundle path so we don't re-bundle on every render
let cachedBundlePath: string | null = null;

/**
 * Bundle the Remotion project once and cache the result.
 * Re-bundles only if cache is empty (first call or after restart).
 */
async function getBundlePath(): Promise<string> {
  if (cachedBundlePath && fs.existsSync(cachedBundlePath)) {
    return cachedBundlePath;
  }

  logger.info('[render] Bundling Remotion project...');
  const entryPoint = path.resolve(process.cwd(), 'remotion/index.ts');

  cachedBundlePath = await bundle({
    entryPoint,
    onProgress: (progress) => {
      if (progress % 25 === 0) {
        logger.info(`[render] Bundle progress: ${progress}%`);
      }
    },
  });

  logger.info(`[render] Bundle ready at ${cachedBundlePath}`);
  return cachedBundlePath;
}

/**
 * Render a reel video and return the output file path.
 */
export async function renderReel(
  projectId: string,
  inputProps: ReelInputProps,
): Promise<{ outputPath: string; durationInSeconds: number }> {
  const bundlePath = await getBundlePath();

  // Get composition metadata
  const compositions = await getCompositions(bundlePath, { inputProps });
  const composition = compositions.find((c) => c.id === 'ReelVideo');

  if (!composition) {
    throw new Error('Composition "ReelVideo" not found in bundle');
  }

  // Ensure output directory exists
  const outputDir = path.resolve(process.cwd(), 'uploads/renders');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `reel-${projectId}-${Date.now()}.mp4`);

  logger.info(`[render] Starting render for project ${projectId}`, {
    durationInFrames: composition.durationInFrames,
    fps: composition.fps,
    width: composition.width,
    height: composition.height,
  });

  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    concurrency: 2,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 10 === 0) {
        logger.info(`[render] Progress: ${Math.round(progress * 100)}%`);
      }
    },
  });

  logger.info(`[render] Render complete: ${outputPath}`);

  return {
    outputPath,
    durationInSeconds: inputProps.durationInSeconds,
  };
}

/**
 * Pre-warm the bundle on server startup (optional).
 */
export async function warmupBundle(): Promise<void> {
  try {
    await getBundlePath();
  } catch (err) {
    logger.warn('[render] Bundle warmup failed (non-critical)', err);
  }
}
