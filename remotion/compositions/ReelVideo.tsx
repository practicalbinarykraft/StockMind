import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  Video,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from 'remotion';
import type { ReelInputProps, ReelScene } from '../types';

/**
 * Main Remotion composition for assembling short-form reels.
 *
 * Layers (bottom to top):
 * 1. Background — B-roll video per scene (or solid color fallback)
 * 2. Avatar — talking-head video (full-screen or PiP)
 * 3. Subtitles — burned-in text synced to scenes
 * 4. Audio — voiceover track
 */
export const ReelVideo: React.FC<ReelInputProps> = ({
  avatarVideoUrl,
  audioUrl,
  scenes,
  subtitlesEnabled,
  layout,
  durationInSeconds,
  fps,
}) => {
  const totalFrames = Math.round(durationInSeconds * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Layer 1: B-roll backgrounds per scene */}
      {scenes.map((scene) => {
        const startFrame = Math.round(scene.startTime * fps);
        const durationFrames = Math.round(scene.duration * fps);

        if (!scene.brollVideoUrl) return null;

        return (
          <Sequence
            key={`broll-${scene.id}`}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <AbsoluteFill>
              <Video
                src={scene.brollVideoUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* Layer 2: Avatar video */}
      {avatarVideoUrl && (
        <Sequence from={0} durationInFrames={totalFrames}>
          <AvatarLayer
            src={avatarVideoUrl}
            layout={layout}
            hasBroll={scenes.some((s) => s.brollVideoUrl)}
          />
        </Sequence>
      )}

      {/* Layer 3: Subtitles */}
      {subtitlesEnabled &&
        scenes.map((scene) => {
          const startFrame = Math.round(scene.startTime * fps);
          const durationFrames = Math.round(scene.duration * fps);

          return (
            <Sequence
              key={`sub-${scene.id}`}
              from={startFrame}
              durationInFrames={durationFrames}
            >
              <SubtitleOverlay text={scene.text} fps={fps} />
            </Sequence>
          );
        })}

      {/* Layer 4: Audio track */}
      {audioUrl && <Audio src={audioUrl} />}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Avatar layer — adapts based on layout mode                        */
/* ------------------------------------------------------------------ */

const AvatarLayer: React.FC<{
  src: string;
  layout: ReelInputProps['layout'];
  hasBroll: boolean;
}> = ({ src, layout, hasBroll }) => {
  const effectiveLayout = hasBroll ? layout : 'avatar-only';

  if (effectiveLayout === 'avatar-only') {
    return (
      <AbsoluteFill>
        <Video
          src={src}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </AbsoluteFill>
    );
  }

  if (effectiveLayout === 'broll-with-pip') {
    // Picture-in-picture: avatar in bottom-right corner
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          right: 40,
          width: 280,
          height: 280,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '4px solid rgba(255,255,255,0.8)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 10,
        }}
      >
        <Video
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
    );
  }

  // avatar-broll-split: top half avatar, bottom half b-roll
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '50%',
        overflow: 'hidden',
      }}
    >
      <Video
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Subtitle overlay with word-by-word animation                       */
/* ------------------------------------------------------------------ */

const SubtitleOverlay: React.FC<{ text: string; fps: number }> = ({
  text,
  fps,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in/out
  const opacity = interpolate(
    frame,
    [0, Math.min(8, durationInFrames), durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // Word-by-word highlight
  const words = text.split(/\s+/);
  const framesPerWord = durationInFrames / words.length;
  const currentWordIndex = Math.min(
    Math.floor(frame / framesPerWord),
    words.length - 1,
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 180,
        left: 40,
        right: 40,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        opacity,
        zIndex: 20,
      }}
    >
      {words.map((word, i) => (
        <span
          key={i}
          style={{
            fontSize: 48,
            fontWeight: 800,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: i === currentWordIndex ? '#FFD700' : '#FFFFFF',
            textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.6)',
            transition: 'color 0.1s',
            lineHeight: 1.3,
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
};
