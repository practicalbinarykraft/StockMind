import { z } from "zod";

const layerTypeSchema = z.enum(["background", "overlay", "textLayer"]);
const contentTypeSchema = z.enum(["avatar", "image", "video"]);
const compositionModeSchema = z.enum(["overlay", "split"]);

export const ScriptIdParamDto = z.object({ scriptId: z.string().min(1) });
export const SceneIdParamDto = z.object({ sceneId: z.string().min(1) });
export const LayerIdParamDto = z.object({ layerId: z.string().min(1) });
export const ScriptIdLayerIdParamsDto = z.object({
  scriptId: z.string().min(1),
  layerId: z.string().min(1),
});

export const GetLayersParamsDto = z.object({
  scriptId: z.string().min(1),
  sceneId: z.string().min(1),
});
export type GetLayersParamsDto = z.infer<typeof GetLayersParamsDto>;

export const CreateLayerBodyDto = z.object({
  layerType: layerTypeSchema,
  order: z.number().int().min(0).optional(),
  isVisible: z.boolean().optional(),
  // background
  contentType: contentTypeSchema.optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  generationPrompt: z.string().optional(),
  generationModel: z.string().optional(),
  dimensions: z.object({ width: z.number(), height: z.number() }).optional(),
  // overlay
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  aspectLock: z.boolean().optional(),
  minSize: z.object({ width: z.number(), height: z.number() }).optional(),
  maxSize: z.object({ width: z.number(), height: z.number() }).optional(),
  // text
  text: z.string().optional(),
  mode: z.enum(["static", "marquee"]).optional(),
  textPosition: z
    .object({
      type: z.enum(["top", "center", "bottom", "custom"]),
      x: z.number().optional(),
      y: z.number().optional(),
    })
    .optional(),
  fontSize: z.number().int().optional(),
  fontFamily: z.string().optional(),
  textColor: z.string().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  backgroundColor: z.string().optional(),
  backgroundOpacity: z.number().min(0).max(1).optional(),
  marqueeSpeed: z.number().optional(),
});
export type CreateLayerBodyDto = z.infer<typeof CreateLayerBodyDto>;

export const UpdateLayerBodyDto = CreateLayerBodyDto.partial();
export type UpdateLayerBodyDto = z.infer<typeof UpdateLayerBodyDto>;

export const UpdateLayerContentBodyDto = z.object({
  contentType: contentTypeSchema.optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
});
export type UpdateLayerContentBodyDto = z.infer<typeof UpdateLayerContentBodyDto>;

export const UpdateCompositionBodyDto = z.object({
  mode: compositionModeSchema.optional(),
  splitRatio: z.number().min(0).max(1).optional(),
  splitDirection: z.enum(["horizontal", "vertical"]).optional(),
  splitOrder: z.enum(["background-first", "overlay-first"]).optional(),
  gridSnapping: z.boolean().optional(),
  gridSize: z.number().int().min(1).optional(),
});
export type UpdateCompositionBodyDto = z.infer<typeof UpdateCompositionBodyDto>;

export const UpdateOverlayPositionBodyDto = z.object({
  position: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});
export type UpdateOverlayPositionBodyDto = z.infer<typeof UpdateOverlayPositionBodyDto>;
