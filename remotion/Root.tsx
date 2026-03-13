import React from 'react';
import { Composition } from 'remotion';
import { ReelVideo } from './compositions/ReelVideo';
import { DEFAULT_REEL_PROPS } from './types';
import type { ReelInputProps } from './types';

/**
 * Remotion entry point — registers all available compositions.
 * Used by both the Remotion Studio (preview) and the server-side renderer.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelVideo"
        component={ReelVideo}
        durationInFrames={DEFAULT_REEL_PROPS.durationInSeconds * DEFAULT_REEL_PROPS.fps}
        fps={DEFAULT_REEL_PROPS.fps}
        width={DEFAULT_REEL_PROPS.width}
        height={DEFAULT_REEL_PROPS.height}
        defaultProps={DEFAULT_REEL_PROPS}
        calculateMetadata={async ({ props }) => {
          const p = props as ReelInputProps;
          return {
            durationInFrames: Math.round(p.durationInSeconds * p.fps),
            fps: p.fps,
            width: p.width,
            height: p.height,
          };
        }}
      />
    </>
  );
};
