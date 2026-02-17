/**
 * Remotion композиция для рендеринга сцены
 * Поддерживает overlay и split режимы
 */

import { AbsoluteFill, Img, Video, interpolate, useCurrentFrame } from 'remotion'
import type { EnhancedScene } from '../../../types/layers'

interface RemotionCompositionProps {
  scene: EnhancedScene
}

export const RemotionComposition: React.FC<RemotionCompositionProps> = ({ scene }) => {
  const frame = useCurrentFrame()
  
  // Проверка наличия необходимых данных
  if (!scene || !scene.composition || !scene.layers) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 24 }}>Сцена не инициализирована</div>
      </AbsoluteFill>
    )
  }
  
  const { composition, layers } = scene
  const { background, overlay, textLayer } = layers

  // Рендеринг контента слоя (background или overlay)
  const renderLayerContent = (
    sourceUrl: string | undefined,
    contentType: 'avatar' | 'image' | 'video'
  ) => {
    if (!sourceUrl) return null

    if (contentType === 'video' || contentType === 'avatar') {
      return <Video src={sourceUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    }

    return <Img src={sourceUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  }

  // Рендеринг текстового слоя
  const renderTextLayer = () => {
    if (!textLayer || !textLayer.isVisible) return null

    const { text, mode, position, fontSize, fontFamily, textColor, textAlign, backgroundColor, backgroundOpacity, marqueeSpeed } = textLayer

    // Для бегущей строки
    if (mode === 'marquee') {
      const translateX = interpolate(
        frame,
        [0, scene.durationInFrames],
        [100, -100],
        { extrapolateRight: 'clamp' }
      )

      return (
        <AbsoluteFill style={{ zIndex: 30, pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: 'auto',
              top: position.type === 'top' ? '10%' : position.type === 'bottom' ? '85%' : '50%',
              transform: `translateY(-50%) translateX(${translateX}%)`,
              backgroundColor: backgroundColor ? `${backgroundColor}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
              padding: '8px 16px',
            }}
          >
            <p
              style={{
                fontSize: `${fontSize}px`,
                fontFamily,
                color: textColor,
                textAlign,
                margin: 0,
                whiteSpace: 'nowrap',
              }}
            >
              {text}
            </p>
          </div>
        </AbsoluteFill>
      )
    }

    // Статичный текст
    const getPositionStyles = () => {
      if (position.type === 'custom') {
        return {
          top: `${position.y || 50}%`,
          left: `${position.x || 50}%`,
          transform: 'translate(-50%, -50%)',
        }
      }

      return {
        top: position.type === 'top' ? '10%' : position.type === 'bottom' ? '85%' : '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    return (
      <AbsoluteFill style={{ zIndex: 30, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            width: '80%',
            ...getPositionStyles(),
            backgroundColor: backgroundColor ? `${backgroundColor}${Math.round(backgroundOpacity * 255).toString(16).padStart(2, '0')}` : 'transparent',
            padding: '8px 16px',
          }}
        >
          <p
            style={{
              fontSize: `${fontSize}px`,
              fontFamily,
              color: textColor,
              textAlign,
              margin: 0,
            }}
          >
            {text}
          </p>
        </div>
      </AbsoluteFill>
    )
  }

  // Overlay режим
  if (composition.mode === 'overlay') {
    return (
      <AbsoluteFill>
        {/* Background слой */}
        {background && background.isVisible && background.sourceUrl && (
          <AbsoluteFill style={{ zIndex: 10 }}>
            {renderLayerContent(background.sourceUrl, background.contentType)}
          </AbsoluteFill>
        )}

        {/* Overlay слой */}
        {overlay && overlay.isVisible && overlay.sourceUrl && (
          <AbsoluteFill style={{ zIndex: 20, pointerEvents: 'none' }}>
            <div
              style={{
                position: 'absolute',
                left: `${overlay.position.x}%`,
                top: `${overlay.position.y}%`,
                width: `${overlay.position.width}%`,
                height: `${overlay.position.height}%`,
              }}
            >
              {renderLayerContent(overlay.sourceUrl, overlay.contentType)}
            </div>
          </AbsoluteFill>
        )}

        {/* Text слой */}
        {renderTextLayer()}
      </AbsoluteFill>
    )
  }

  // Split режим
  if (composition.mode === 'split') {
    const isHorizontal = composition.splitDirection === 'horizontal'
    const ratio = composition.splitRatio
    const backgroundFirst = composition.splitOrder === 'background-first'

    const backgroundStyle: React.CSSProperties = isHorizontal
      ? {
          position: 'absolute',
          left: backgroundFirst ? 0 : `${ratio * 100}%`,
          top: 0,
          width: `${ratio * 100}%`,
          height: '100%',
        }
      : {
          position: 'absolute',
          left: 0,
          top: backgroundFirst ? 0 : `${ratio * 100}%`,
          width: '100%',
          height: `${ratio * 100}%`,
        }

    const overlayStyle: React.CSSProperties = isHorizontal
      ? {
          position: 'absolute',
          left: backgroundFirst ? `${ratio * 100}%` : 0,
          top: 0,
          width: `${(1 - ratio) * 100}%`,
          height: '100%',
        }
      : {
          position: 'absolute',
          left: 0,
          top: backgroundFirst ? `${ratio * 100}%` : 0,
          width: '100%',
          height: `${(1 - ratio) * 100}%`,
        }

    return (
      <AbsoluteFill>
        {/* Background слой */}
        {background && background.isVisible && background.sourceUrl && (
          <div style={{ ...backgroundStyle, zIndex: 10 }}>
            {renderLayerContent(background.sourceUrl, background.contentType)}
          </div>
        )}

        {/* Overlay слой */}
        {overlay && overlay.isVisible && overlay.sourceUrl && (
          <div style={{ ...overlayStyle, zIndex: 20 }}>
            {renderLayerContent(overlay.sourceUrl, overlay.contentType)}
          </div>
        )}

        {/* Text слой */}
        {renderTextLayer()}
      </AbsoluteFill>
    )
  }

  return null
}
