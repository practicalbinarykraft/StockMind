/**
 * Remotion композиция для рендеринга сцены
 * Поддерживает overlay и split режимы, текстовые эффекты и анимации
 */

import { AbsoluteFill, Img, Video, interpolate, useCurrentFrame } from 'remotion'
import type { EnhancedScene, TextLayer } from '../../../types/layers'

interface RemotionCompositionProps {
  scene: EnhancedScene
  avatarVideoUrl?: string
  videoStartFrame?: number
}

export const RemotionComposition: React.FC<RemotionCompositionProps> = ({ scene, avatarVideoUrl, videoStartFrame = 0 }) => {
  const frame = useCurrentFrame()
  
  if (!scene || !scene.composition || !scene.layers) {
    return (
      <AbsoluteFill style={{ backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 24 }}>Сцена не инициализирована</div>
      </AbsoluteFill>
    )
  }
  
  const { composition, layers } = scene
  const { background, overlay, textLayer } = layers

  const resolveSourceUrl = (
    sourceUrl: string | undefined,
    contentType: 'avatar' | 'image' | 'video'
  ): string | undefined => {
    if (sourceUrl) return sourceUrl
    if (contentType === 'avatar' && avatarVideoUrl) return avatarVideoUrl
    return undefined
  }

  const hasLayerContent = (
    sourceUrl: string | undefined,
    contentType: 'avatar' | 'image' | 'video'
  ): boolean => !!resolveSourceUrl(sourceUrl, contentType)

  const renderLayerContent = (
    sourceUrl: string | undefined,
    contentType: 'avatar' | 'image' | 'video'
  ) => {
    const resolvedUrl = resolveSourceUrl(sourceUrl, contentType)
    if (!resolvedUrl) return null

    if (contentType === 'video' || contentType === 'avatar') {
      return (
        <Video
          src={resolvedUrl}
          startFrom={contentType === 'avatar' ? videoStartFrame : 0}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )
    }

    return <Img src={resolvedUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  }

  const getAnimationStyles = (tl: TextLayer): React.CSSProperties => {
    const animation = tl.animation || 'none'
    if (animation === 'none') return {}

    const duration = scene.durationInFrames
    const animDuration = Math.min(duration, 30) // ~1 секунда при 30 fps

    switch (animation) {
      case 'fadeIn': {
        const opacity = interpolate(frame, [0, animDuration], [0, 1], { extrapolateRight: 'clamp' })
        return { opacity }
      }
      case 'slideUp': {
        const translateY = interpolate(frame, [0, animDuration], [50, 0], { extrapolateRight: 'clamp' })
        const opacity = interpolate(frame, [0, animDuration / 2], [0, 1], { extrapolateRight: 'clamp' })
        return { transform: `translateY(${translateY}px)`, opacity }
      }
      case 'slideDown': {
        const translateY = interpolate(frame, [0, animDuration], [-50, 0], { extrapolateRight: 'clamp' })
        const opacity = interpolate(frame, [0, animDuration / 2], [0, 1], { extrapolateRight: 'clamp' })
        return { transform: `translateY(${translateY}px)`, opacity }
      }
      case 'scaleIn': {
        const scale = interpolate(frame, [0, animDuration], [0.5, 1], { extrapolateRight: 'clamp' })
        const opacity = interpolate(frame, [0, animDuration / 2], [0, 1], { extrapolateRight: 'clamp' })
        return { transform: `scale(${scale})`, opacity }
      }
      case 'typewriter': {
        const fullText = tl.text || ''
        const charsToShow = Math.floor(interpolate(frame, [0, animDuration * 2], [0, fullText.length], { extrapolateRight: 'clamp' }))
        return { '--typewriter-chars': charsToShow } as React.CSSProperties
      }
      default:
        return {}
    }
  }

  const getTextEffectStyles = (tl: TextLayer): React.CSSProperties => {
    const styles: React.CSSProperties = {}

    if (tl.textShadow && tl.textShadow !== 'none') {
      styles.textShadow = tl.textShadow
    }

    if (tl.textStroke && tl.textStroke !== 'none' && tl.textStroke !== '') {
      styles.WebkitTextStroke = `${tl.textStroke} ${tl.textStrokeColor || '#000000'}`
    }

    if (tl.letterSpacing != null) {
      styles.letterSpacing = `${tl.letterSpacing}px`
    }

    if (tl.lineHeight != null) {
      styles.lineHeight = tl.lineHeight
    }

    return styles
  }

  const bgWithOpacity = (color: string | undefined, opacity: number): string => {
    if (!color) return 'transparent'
    const hex = color.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    if (isNaN(r) || isNaN(g) || isNaN(b)) return 'transparent'
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  const renderTextLayer = () => {
    if (!textLayer || !textLayer.isVisible) return null

    const { text, mode, position, fontSize, fontFamily, textColor, textAlign, backgroundColor, backgroundOpacity } = textLayer
    const animStyles = getAnimationStyles(textLayer)
    const effectStyles = getTextEffectStyles(textLayer)

    const displayText = textLayer.animation === 'typewriter'
      ? (text || '').slice(0, (animStyles as any)['--typewriter-chars'] ?? text?.length)
      : text

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
              backgroundColor: bgWithOpacity(backgroundColor, backgroundOpacity),
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
                ...effectStyles,
              }}
            >
              {displayText}
            </p>
          </div>
        </AbsoluteFill>
      )
    }

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

    const posStyles = getPositionStyles()
    const combinedTransform = [
      posStyles.transform,
      animStyles.transform,
    ].filter(Boolean).join(' ')

    return (
      <AbsoluteFill style={{ zIndex: 30, pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            width: '80%',
            ...posStyles,
            transform: combinedTransform,
            opacity: animStyles.opacity,
            backgroundColor: bgWithOpacity(backgroundColor, backgroundOpacity),
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
              ...effectStyles,
            }}
          >
            {displayText}
          </p>
        </div>
      </AbsoluteFill>
    )
  }

  // Overlay режим
  if (composition.mode === 'overlay') {
    return (
      <AbsoluteFill>
        {background && background.isVisible && hasLayerContent(background.sourceUrl, background.contentType) && (
          <AbsoluteFill style={{ zIndex: 10 }}>
            {renderLayerContent(background.sourceUrl, background.contentType)}
          </AbsoluteFill>
        )}

        {overlay && overlay.isVisible && hasLayerContent(overlay.sourceUrl, overlay.contentType) && (
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
        {background && background.isVisible && hasLayerContent(background.sourceUrl, background.contentType) && (
          <div style={{ ...backgroundStyle, zIndex: 10 }}>
            {renderLayerContent(background.sourceUrl, background.contentType)}
          </div>
        )}

        {overlay && overlay.isVisible && hasLayerContent(overlay.sourceUrl, overlay.contentType) && (
          <div style={{ ...overlayStyle, zIndex: 20 }}>
            {renderLayerContent(overlay.sourceUrl, overlay.contentType)}
          </div>
        )}

        {renderTextLayer()}
      </AbsoluteFill>
    )
  }

  return null
}
