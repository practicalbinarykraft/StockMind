import { scriptsLibraryService } from "../scripts-library/scripts-library.service";
import { sceneLayersRepo } from "./scene-layers.repo";
import { backgroundLayersRepo } from "./background-layers.repo";
import { overlayLayersRepo } from "./overlay-layers.repo";
import { textLayersRepo } from "./text-layers.repo";
import { sceneCompositionsRepo } from "./scene-compositions.repo";
import type { SceneLayer } from "@shared/schema";
import type { InsertSceneLayer } from "@shared/schema";

type CompositionMode = "overlay" | "split";
type ContentType = "avatar" | "image" | "video";

interface SceneFromScript {
  id?: string;
  sceneId?: string;
  order?: number;
  text?: string;
  [key: string]: unknown;
}

export interface SceneWithLayers {
  sceneId: string;
  scene: SceneFromScript;
  composition: Awaited<ReturnType<typeof sceneCompositionsRepo.getBySceneId>>;
  layers: Array<{
    base: SceneLayer;
    background?: Awaited<ReturnType<typeof backgroundLayersRepo.getByLayerId>>;
    overlay?: Awaited<ReturnType<typeof overlayLayersRepo.getByLayerId>>;
    text?: Awaited<ReturnType<typeof textLayersRepo.getByLayerId>>;
  }>;
}

export interface ScriptWithLayers {
  script: Awaited<ReturnType<typeof scriptsLibraryService.getScriptById>>;
  scenes: SceneWithLayers[];
}

function normalizeSceneId(scene: SceneFromScript, index: number): string {
  return (scene.id ?? scene.sceneId ?? `scene-${index}`) as string;
}

async function enrichLayersForScene(sceneId: string) {
  const baseLayers = await sceneLayersRepo.getLayersBySceneId(sceneId);
  const [composition] = await Promise.all([
    sceneCompositionsRepo.getBySceneId(sceneId),
    ...baseLayers.map(async (base) => {
      const [background, overlay, text] = await Promise.all([
        base.layerType === "background" ? backgroundLayersRepo.getByLayerId(base.id) : undefined,
        base.layerType === "overlay" ? overlayLayersRepo.getByLayerId(base.id) : undefined,
        base.layerType === "textLayer" ? textLayersRepo.getByLayerId(base.id) : undefined,
      ]);
      return { base, background, overlay, text };
    }),
  ]);
  const layers = await Promise.all(
    baseLayers.map(async (base) => {
      const background = base.layerType === "background" ? await backgroundLayersRepo.getByLayerId(base.id) : undefined;
      const overlay = base.layerType === "overlay" ? await overlayLayersRepo.getByLayerId(base.id) : undefined;
      const text = base.layerType === "textLayer" ? await textLayersRepo.getByLayerId(base.id) : undefined;
      return { base, background, overlay, text };
    })
  );
  return { composition, layers };
}

export const sceneLayersService = {
  async getSceneWithLayers(
    scriptId: string,
    sceneId: string,
    userId: string
  ): Promise<SceneWithLayers> {
    const script = await scriptsLibraryService.getScriptById(scriptId, userId);
    const scenes = (script.scenes as SceneFromScript[]) ?? [];
    const scene = scenes.find((s) => normalizeSceneId(s, scenes.indexOf(s)) === sceneId);
    if (!scene) {
      throw new Error("Scene not found");
    }
    const { composition, layers } = await enrichLayersForScene(sceneId);
    return {
      sceneId,
      scene,
      composition: composition ?? undefined,
      layers,
    };
  },

  async getScriptWithLayers(scriptId: string, userId: string): Promise<ScriptWithLayers> {
    const script = await scriptsLibraryService.getScriptById(scriptId, userId);
    const scenes = (script.scenes as SceneFromScript[]) ?? [];
    const scenesWithLayers: SceneWithLayers[] = await Promise.all(
      scenes.map(async (scene, index) => {
        const sceneId = normalizeSceneId(scene, index);
        const { composition, layers } = await enrichLayersForScene(sceneId);
        return {
          sceneId,
          scene,
          composition: composition ?? undefined,
          layers,
        };
      })
    );
    return { script, scenes: scenesWithLayers };
  },

  async createDefaultLayers(sceneId: string, scriptId: string): Promise<void> {
    const existing = await sceneLayersRepo.getLayersBySceneId(sceneId);
    if (existing.length > 0) return;

    await sceneCompositionsRepo.createOrUpdate(sceneId, scriptId, {});

    const defaultOrder = [
      { layerType: "background" as const, order: 0 },
      { layerType: "overlay" as const, order: 1 },
      { layerType: "textLayer" as const, order: 2 },
    ];

    for (const { layerType, order } of defaultOrder) {
      const base = await sceneLayersRepo.createLayer({
        sceneId,
        scriptId,
        layerType,
        order,
        isVisible: true,
      });
      if (layerType === "background") {
        await backgroundLayersRepo.create({
          layerId: base.id,
          contentType: "avatar",
        });
      }
      if (layerType === "overlay") {
        await overlayLayersRepo.create({
          layerId: base.id,
          contentType: "image",
          position: { x: 10, y: 10, width: 30, height: 30 },
          aspectLock: true,
        });
      }
      if (layerType === "textLayer") {
        await textLayersRepo.create({
          layerId: base.id,
          text: "",
          mode: "static",
          position: { type: "bottom" },
        });
      }
    }
  },

  async createLayer(
    scriptId: string,
    sceneId: string,
    userId: string,
    data: {
      layerType: "background" | "overlay" | "textLayer";
      order?: number;
      isVisible?: boolean;
      contentType?: ContentType;
      sourceUrl?: string;
      position?: { x: number; y: number; width: number; height: number };
      aspectLock?: boolean;
      text?: string;
      mode?: "static" | "marquee";
      positionText?: { type: "top" | "center" | "bottom" | "custom"; x?: number; y?: number };
    }
  ) {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    const maxOrder = (await sceneLayersRepo.getLayersBySceneId(sceneId)).reduce(
      (acc, l) => Math.max(acc, l.order ?? 0),
      0
    );
    const insert: InsertSceneLayer = {
      sceneId,
      scriptId,
      layerType: data.layerType,
      order: data.order ?? maxOrder + 1,
      isVisible: data.isVisible ?? true,
    };
    const base = await sceneLayersRepo.createLayer(insert);
    if (data.layerType === "background") {
      await backgroundLayersRepo.create({
        layerId: base.id,
        contentType: data.contentType ?? "image",
        sourceUrl: data.sourceUrl ?? undefined,
      });
    }
    if (data.layerType === "overlay") {
      await overlayLayersRepo.create({
        layerId: base.id,
        contentType: data.contentType ?? "image",
        sourceUrl: data.sourceUrl,
        position: data.position ?? { x: 10, y: 10, width: 30, height: 30 },
        aspectLock: data.aspectLock ?? true,
      });
    }
    if (data.layerType === "textLayer") {
      await textLayersRepo.create({
        layerId: base.id,
        text: data.text ?? "",
        mode: data.mode ?? "static",
        position: data.positionText ?? { type: "bottom" },
      });
    }
    const layers = await sceneLayersRepo.getLayersBySceneId(sceneId);
    const withDetails = await Promise.all(
      layers.map(async (l) => {
        const bg = l.layerType === "background" ? await backgroundLayersRepo.getByLayerId(l.id) : undefined;
        const ov = l.layerType === "overlay" ? await overlayLayersRepo.getByLayerId(l.id) : undefined;
        const tx = l.layerType === "textLayer" ? await textLayersRepo.getByLayerId(l.id) : undefined;
        return { base: l, background: bg, overlay: ov, text: tx };
      })
    );
    return { layers: withDetails };
  },

  async updateLayerContent(
    layerId: string,
    _userId: string,
    contentType: ContentType,
    sourceUrl: string | undefined
  ): Promise<void> {
    const base = await sceneLayersRepo.getById(layerId);
    if (!base) throw new Error("Layer not found");
    const payload = { contentType, sourceUrl: sourceUrl ?? undefined };
    const bg = await backgroundLayersRepo.getByLayerId(layerId);
    if (bg) await backgroundLayersRepo.updateByLayerId(layerId, payload);
    const ov = await overlayLayersRepo.getByLayerId(layerId);
    if (ov) await overlayLayersRepo.update(ov.id, payload);
  },

  async updateCompositionMode(sceneId: string, scriptId: string, userId: string, mode: CompositionMode): Promise<void> {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    await sceneCompositionsRepo.createOrUpdate(sceneId, scriptId, { mode });
  },

  async updateSplitSettings(
    sceneId: string,
    scriptId: string,
    userId: string,
    settings: { splitRatio?: number; splitDirection?: "horizontal" | "vertical"; splitOrder?: "background-first" | "overlay-first" }
  ): Promise<void> {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    await sceneCompositionsRepo.createOrUpdate(sceneId, scriptId, settings);
  },

  async updateComposition(
    sceneId: string,
    scriptId: string,
    userId: string,
    data: {
      mode?: CompositionMode;
      splitRatio?: number;
      splitDirection?: "horizontal" | "vertical";
      splitOrder?: "background-first" | "overlay-first";
      gridSnapping?: boolean;
      gridSize?: number;
    }
  ): Promise<void> {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    await sceneCompositionsRepo.createOrUpdate(sceneId, scriptId, data);
  },

  async updateLayer(
    layerId: string,
    scriptId: string,
    userId: string,
    data: Partial<SceneLayer> & Record<string, unknown>
  ): Promise<void> {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    const base = await sceneLayersRepo.getById(layerId);
    if (!base) throw new Error("Layer not found");
    const { layerType, ...rest } = data;
    const baseUpdate = { order: rest.order, isVisible: rest.isVisible };
    if (Object.keys(baseUpdate).some((k) => (baseUpdate as any)[k] !== undefined)) {
      await sceneLayersRepo.updateLayer(layerId, baseUpdate as Partial<SceneLayer>);
    }
    if (base.layerType === "background") {
      const bgUpdate: Record<string, unknown> = {};
      if (rest.contentType !== undefined) bgUpdate.contentType = rest.contentType;
      if (rest.sourceUrl !== undefined) bgUpdate.sourceUrl = rest.sourceUrl;
      if (rest.metadata !== undefined) bgUpdate.metadata = rest.metadata;
      if (Object.keys(bgUpdate).length > 0) {
        await backgroundLayersRepo.updateByLayerId(layerId, bgUpdate);
      }
    }
    if (base.layerType === "overlay") {
      if (rest.position) await overlayLayersRepo.updatePosition(layerId, rest.position as any);
      const ov = await overlayLayersRepo.getByLayerId(layerId);
      if (ov) {
        const ovUpdate: Record<string, unknown> = {};
        if (rest.contentType !== undefined) ovUpdate.contentType = rest.contentType;
        if (rest.sourceUrl !== undefined) ovUpdate.sourceUrl = rest.sourceUrl;
        if (rest.objectFit !== undefined) ovUpdate.objectFit = rest.objectFit;
        if (rest.metadata !== undefined) ovUpdate.metadata = rest.metadata;
        if (Object.keys(ovUpdate).length > 0) {
          await overlayLayersRepo.update(ov.id, ovUpdate);
        }
      }
    }
    if (base.layerType === "textLayer") {
      const tx = await textLayersRepo.getByLayerId(layerId);
      if (tx && (rest.text !== undefined || rest.mode !== undefined || rest.position !== undefined || rest.fontSize !== undefined)) {
        await textLayersRepo.updateByLayerId(layerId, {
          text: rest.text as string | undefined,
          mode: rest.mode as "static" | "marquee" | undefined,
          position: rest.position as any,
          fontSize: rest.fontSize as number | undefined,
        });
      }
    }
  },

  async deleteLayer(layerId: string, scriptId: string, userId: string): Promise<void> {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    const base = await sceneLayersRepo.getById(layerId);
    if (!base) throw new Error("Layer not found");
    if (base.layerType === "background") await backgroundLayersRepo.deleteByLayerId(layerId);
    if (base.layerType === "overlay") await overlayLayersRepo.deleteByLayerId(layerId);
    if (base.layerType === "textLayer") await textLayersRepo.deleteByLayerId(layerId);
    await sceneLayersRepo.deleteLayer(layerId);
  },

  async getLayersBySceneId(scriptId: string, sceneId: string, userId: string) {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    const baseLayers = await sceneLayersRepo.getLayersBySceneId(sceneId);
    const layers = await Promise.all(
      baseLayers.map(async (base) => {
        const background = base.layerType === "background" ? await backgroundLayersRepo.getByLayerId(base.id) : undefined;
        const overlay = base.layerType === "overlay" ? await overlayLayersRepo.getByLayerId(base.id) : undefined;
        const text = base.layerType === "textLayer" ? await textLayersRepo.getByLayerId(base.id) : undefined;
        return { base, background, overlay, text };
      })
    );
    return { layers };
  },

  async updateOverlayPosition(
    layerId: string,
    scriptId: string,
    userId: string,
    position: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    await overlayLayersRepo.updatePosition(layerId, position);
  },

  async getLayerSourceUrl(
    layerId: string,
    scriptId: string,
    userId: string,
  ): Promise<{ sourceUrl: string; contentType: ContentType; layerType: string }> {
    await scriptsLibraryService.getScriptById(scriptId, userId);
    const base = await sceneLayersRepo.getById(layerId);
    if (!base) throw new Error("Layer not found");

    let sourceUrl: string | undefined | null;
    let contentType: ContentType = "image";

    if (base.layerType === "background") {
      const bg = await backgroundLayersRepo.getByLayerId(layerId);
      sourceUrl = bg?.sourceUrl;
      contentType = (bg?.contentType as ContentType) || "image";
    } else if (base.layerType === "overlay") {
      const ov = await overlayLayersRepo.getByLayerId(layerId);
      sourceUrl = ov?.sourceUrl;
      contentType = (ov?.contentType as ContentType) || "image";
    }

    if (!sourceUrl) throw new Error("Layer has no media");

    return { sourceUrl, contentType, layerType: base.layerType };
  },
};
