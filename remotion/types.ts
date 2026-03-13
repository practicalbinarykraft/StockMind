export interface ReelScene {
  id: string;
  text: string;
  type: 'hook' | 'body' | 'cta';
  startTime: number;
  endTime: number;
  duration: number;
  score?: number;
  brollVideoUrl?: string;
}

export interface ReelInputProps {
  /** Avatar talking-head video (MP4 from HeyGen) */
  avatarVideoUrl: string;
  /** Voiceover audio (MP3 from ElevenLabs or uploaded) */
  audioUrl: string;
  /** Total video duration in seconds */
  durationInSeconds: number;
  /** Scene breakdown with timecodes */
  scenes: ReelScene[];
  /** Full script text (for subtitle generation) */
  fullScript: string;
  /** Whether to show burned-in subtitles */
  subtitlesEnabled: boolean;
  /** Layout mode */
  layout: 'avatar-only' | 'avatar-broll-split' | 'broll-with-pip';
  /** Frames per second */
  fps: number;
  /** Video width */
  width: number;
  /** Video height */
  height: number;
}

export const DEFAULT_REEL_PROPS: ReelInputProps = {
  avatarVideoUrl: '',
  audioUrl: '',
  durationInSeconds: 30,
  scenes: [],
  fullScript: '',
  subtitlesEnabled: true,
  layout: 'avatar-only',
  fps: 30,
  width: 1080,
  height: 1920,
};
