import axios from 'axios';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const UPLOAD_DIR = './uploads/instagram-reels';
const DOWNLOAD_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;

export interface DownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadFile(url: string, outputPath: string, retries = 0): Promise<DownloadResult> {
  try {
    console.log(`[Instagram Download] Downloading: ${url.substring(0, 100)}...`);
    
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: DOWNLOAD_TIMEOUT,
      maxContentLength: 500 * 1024 * 1024, // 500MB max
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    await writeFile(outputPath, Buffer.from(response.data));
    
    console.log(`[Instagram Download] Success: ${outputPath}`);
    return { success: true, localPath: outputPath };
    
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`[Instagram Download] Error (attempt ${retries + 1}/${MAX_RETRIES}):`, errorMsg);

    if (retries < MAX_RETRIES - 1) {
      const backoffMs = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
      console.log(`[Instagram Download] Retrying in ${backoffMs}ms...`);
      await sleep(backoffMs);
      return downloadFile(url, outputPath, retries + 1);
    }

    return {
      success: false,
      error: `Failed after ${MAX_RETRIES} attempts: ${errorMsg}`,
    };
  }
}

async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    console.log(`[Instagram Download] Created directory: ${UPLOAD_DIR}`);
  }
}

export async function downloadInstagramVideo(
  videoUrl: string,
  itemId: string
): Promise<DownloadResult> {
  try {
    await ensureUploadDir();
    
    const filename = `${itemId}.mp4`;
    const localPath = join(UPLOAD_DIR, filename);
    
    return await downloadFile(videoUrl, localPath);
    
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`[Instagram Download] Video download failed:`, errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function downloadInstagramThumbnail(
  thumbnailUrl: string,
  itemId: string
): Promise<DownloadResult> {
  try {
    await ensureUploadDir();
    
    const filename = `${itemId}.jpg`;
    const localPath = join(UPLOAD_DIR, filename);
    
    return await downloadFile(thumbnailUrl, localPath);
    
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`[Instagram Download] Thumbnail download failed:`, errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function downloadInstagramMedia(
  videoUrl: string,
  thumbnailUrl: string | null,
  itemId: string
): Promise<{
  video: DownloadResult;
  thumbnail: DownloadResult | null;
}> {
  console.log(`[Instagram Download] Starting media download for item: ${itemId}`);
  
  const video = await downloadInstagramVideo(videoUrl, itemId);
  
  let thumbnail: DownloadResult | null = null;
  if (thumbnailUrl) {
    thumbnail = await downloadInstagramThumbnail(thumbnailUrl, itemId);
  }
  
  console.log(`[Instagram Download] Media download completed for item: ${itemId}`);
  console.log(`  - Video: ${video.success ? 'SUCCESS' : 'FAILED'}`);
  if (thumbnail) {
    console.log(`  - Thumbnail: ${thumbnail.success ? 'SUCCESS' : 'FAILED'}`);
  }
  
  return { video, thumbnail };
}
