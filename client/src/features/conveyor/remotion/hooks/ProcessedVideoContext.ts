import { createContext, useContext } from "react";

/**
 * Контекст для URL'ов обработанных видео (серверный background removal).
 * Ключ — layerId, значение — URL для стриминга обработанного видео.
 */
export type ProcessedVideoMap = Map<string, string>;

const ProcessedVideoContext = createContext<ProcessedVideoMap>(new Map());

export const ProcessedVideoProvider = ProcessedVideoContext.Provider;

export function useProcessedVideoUrl(
  layerId: string | undefined,
): string | undefined {
  const map = useContext(ProcessedVideoContext);
  return layerId ? map.get(layerId) : undefined;
}
