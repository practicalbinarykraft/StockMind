// ============================================================================
// TEXT LAYER RENDERER
// ============================================================================
// Компонент для рендеринга текстового слоя (static/marquee)

import React from "react";
import { interpolate, Easing } from "remotion";
import type { TextLayer } from "../../types/layers";

function bgColorWithOpacity(color: string | undefined, opacity: number): string {
  if (!color) return "transparent";
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return "transparent";
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export interface TextLayerRendererProps {
  layer: TextLayer;
  sceneFrame: number;
  sceneDuration: number;
  width: number;
  height: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Определяет CSS-стили для вертикальной позиции текста
 */
function getVerticalPosition(layer: TextLayer): React.CSSProperties {
  switch (layer.position.type) {
    case "top":
      return { top: 0, paddingTop: 40 };

    case "center":
      return {
        top: "50%",
        transform: "translateY(-50%)",
      };

    case "bottom":
      return { bottom: 0, paddingBottom: 40 };

    case "custom":
      if (layer.position.x !== undefined && layer.position.y !== undefined) {
        return {
          left: `${layer.position.x}%`,
          top: `${layer.position.y}%`,
        };
      }
      return {};

    default:
      return {};
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export const TextLayerRenderer: React.FC<TextLayerRendererProps> = ({
  layer,
  sceneFrame,
  sceneDuration,
  width,
  height,
}) => {
  const verticalPosition = getVerticalPosition(layer);

  // Статичный режим текста
  if (layer.mode === "static") {
    return (
      <div
        style={{
          position: "absolute",
          width: "100%",
          textAlign: layer.textAlign,
          color: layer.textColor,
          fontSize: layer.fontSize,
          fontFamily: layer.fontFamily,
          backgroundColor: bgColorWithOpacity(layer.backgroundColor, layer.backgroundOpacity),
          padding: "20px 40px",
          zIndex: 2,
          ...verticalPosition,
        }}
      >
        {layer.text}
      </div>
    );
  }

  // Режим бегущей строки (marquee)
  if (layer.mode === "marquee") {
    // Вычисляем смещение для анимации бегущей строки
    const marqueeOffset = interpolate(
      sceneFrame,
      [0, sceneDuration],
      [width, -width * 2], // Начинаем справа, уходим влево за пределы экрана
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.linear,
      },
    );

    return (
      <div
        style={{
          position: "absolute",
          width: "100%",
          overflow: "hidden",
          textAlign: "left",
          backgroundColor: bgColorWithOpacity(layer.backgroundColor, layer.backgroundOpacity),
          padding: "20px 0",
          zIndex: 2,
          ...verticalPosition,
        }}
      >
        <div
          style={{
            position: "relative",
            left: marqueeOffset,
            whiteSpace: "nowrap",
            color: layer.textColor,
            fontSize: layer.fontSize,
            fontFamily: layer.fontFamily,
            paddingLeft: 40,
            paddingRight: 40,
          }}
        >
          {layer.text}
        </div>
      </div>
    );
  }

  return null;
};
