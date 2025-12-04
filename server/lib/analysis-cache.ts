/**
 * In-memory cache for temporary AI analyses
 * Simple LRU cache with max 50 entries, 1 hour TTL
 */

interface CachedAnalysis {
  scenesHash: string;
  timestamp: number;
  result: {
    analysis: any;
    recommendations: any[];
    review: string;
  };
}

const temporaryAnalysisCache = new Map<string, CachedAnalysis>();
const MAX_CACHE_SIZE = 50;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function getCachedTemporaryAnalysis(scenesHash: string): CachedAnalysis['result'] | null {
  const cached = temporaryAnalysisCache.get(scenesHash);
  if (!cached) return null;

  // Check TTL
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    temporaryAnalysisCache.delete(scenesHash);
    return null;
  }

  return cached.result;
}

export function setCachedTemporaryAnalysis(scenesHash: string, result: CachedAnalysis['result']) {
  // Evict oldest entry if cache is full
  if (temporaryAnalysisCache.size >= MAX_CACHE_SIZE) {
    const firstKey = temporaryAnalysisCache.keys().next().value;
    if (firstKey) {
      temporaryAnalysisCache.delete(firstKey);
    }
  }

  temporaryAnalysisCache.set(scenesHash, {
    scenesHash,
    timestamp: Date.now(),
    result
  });
}
