// ============================================================================
// SEGMENTATION CACHE CONTEXT
// ============================================================================
// Контекст для передачи предрассчитанных масок сегментации
// из RemotionPreview вглубь дерева компонентов (до SegmentedVideo)
// без пробрасывания props через каждый промежуточный рендерер.

import { createContext, useContext } from "react";
import type { MaskCache } from "./useSegmentationPreprocess";

export type SegmentationCacheMap = Map<string, MaskCache>;

const SegmentationCacheContext = createContext<SegmentationCacheMap>(new Map());

export const SegmentationCacheProvider = SegmentationCacheContext.Provider;

export function useSegmentationCacheFor(src: string): MaskCache | undefined {
  const caches = useContext(SegmentationCacheContext);
  return caches.get(src);
}
