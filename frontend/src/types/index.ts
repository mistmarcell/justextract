export interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
}

export interface Media {
  id: string;
  projectId: string | null;
  userId: string | null;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  codec: string | null;
  bitrate: number | null;
  audioCodec: string | null;
  audioChannels: number | null;
  sampleRate: number | null;
  thumbnail: string | null;
  source: string;
  url: string | null;
  metadata: any;
  createdAt: string;
}

export interface Job {
  id: string;
  userId: string | null;
  mediaId: string | null;
  type: 'AUDIO_EXTRACT' | 'VIDEO_SPLIT' | 'CLIP_EXPORT' | 'AUDIO_EXPORT' | 'URL_IMPORT' | 'WAVEFORM_GENERATE';
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  params: any;
  output: any;
  outputPath: string | null;
  outputSize: number | null;
  error: string | null;
  thumbnail: string | null;
  createdAt: string;
  completedAt: string | null;
  media?: Media;
}

export interface Project {
  id: string;
  userId: string | null;
  title: string;
  thumbnail: string | null;
  duration: number | null;
  state: ProjectState;
  createdAt: string;
  updatedAt: string;
  media: Media[];
  clips: Clip[];
  markers: TimelineMarker[];
  _count?: { clips: number; markers: number };
}

export interface ProjectState {
  timelineZoom: number;
  playheadPosition: number;
  markers: TimelineMarker[];
  clips: Clip[];
}

export interface TimelineMarker {
  id: string;
  projectId: string;
  time: number;
  type: string;
  label: string | null;
  color: string | null;
  locked: boolean;
}

export interface Clip {
  id: string;
  projectId: string;
  name: string | null;
  startTime: number;
  endTime: number;
  color: string | null;
  locked: boolean;
  order: number;
}

export interface AudioExportOptions {
  format: 'mp3' | 'wav' | 'aac' | 'flac' | 'ogg' | 'm4a' | 'opus';
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  startTime?: number;
  endTime?: number;
  normalize?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface VideoExportOptions {
  format: 'mp4' | 'mov' | 'webm' | 'mkv';
  codec?: 'h264' | 'h265' | 'av1' | 'vp9';
  resolution?: 'original' | '2160' | '1440' | '1080' | '720' | '480';
  fps?: 'original' | '24' | '30' | '60';
  markers: Array<{ start: number; end: number; name?: string }>;
}

export interface UrlMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  formats: Array<{ quality: string; format: string; size: number }>;
}
