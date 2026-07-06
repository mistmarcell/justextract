import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'justextract-theme' }
  )
);

interface PlayerStore {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isFullscreen: boolean;
  isMuted: boolean;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setMuted: (muted: boolean) => void;
}

export const usePlayerStore = create<PlayerStore>()((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isFullscreen: false,
  isMuted: false,
  setPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
  setMuted: (muted) => set({ isMuted: muted }),
}));

interface TimelineStore {
  zoom: number;
  playheadPosition: number;
  markers: Array<{ time: number; label?: string; color?: string }>;
  clips: Array<{ id: string; start: number; end: number; name?: string; color?: string }>;
  selectedClipId: string | null;
  setZoom: (zoom: number) => void;
  setPlayheadPosition: (position: number) => void;
  addMarker: (time: number, label?: string, color?: string) => void;
  removeMarker: (time: number) => void;
  addClip: (start: number, end: number, name?: string, color?: string) => void;
  updateClip: (id: string, data: Partial<{ start: number; end: number; name: string; color: string }>) => void;
  removeClip: (id: string) => void;
  selectClip: (id: string | null) => void;
}

export const useTimelineStore = create<TimelineStore>()((set) => ({
  zoom: 1,
  playheadPosition: 0,
  markers: [],
  clips: [],
  selectedClipId: null,
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(zoom, 10)) }),
  setPlayheadPosition: (position) => set({ playheadPosition: position }),
  addMarker: (time, label, color) =>
    set((state) => ({ markers: [...state.markers, { time, label, color }] })),
  removeMarker: (time) =>
    set((state) => ({ markers: state.markers.filter((m) => m.time !== time) })),
  addClip: (start, end, name, color) =>
    set((state) => ({
      clips: [
        ...state.clips,
        { id: Math.random().toString(36).slice(2), start, end, name, color },
      ],
    })),
  updateClip: (id, data) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),
  removeClip: (id) =>
    set((state) => ({ clips: state.clips.filter((c) => c.id !== id) })),
  selectClip: (id) => set({ selectedClipId: id }),
}));

interface UIStore {
  sidebarOpen: boolean;
  exportPanelOpen: boolean;
  audioPanelOpen: boolean;
  splitPanelOpen: boolean;
  toggleSidebar: () => void;
  setExportPanelOpen: (open: boolean) => void;
  setAudioPanelOpen: (open: boolean) => void;
  setSplitPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  exportPanelOpen: false,
  audioPanelOpen: false,
  splitPanelOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setExportPanelOpen: (open) => set({ exportPanelOpen: open }),
  setAudioPanelOpen: (open) => set({ audioPanelOpen: open }),
  setSplitPanelOpen: (open) => set({ splitPanelOpen: open }),
}));

interface JobStore {
  jobs: Array<Job>;
  addJob: (job: Job) => void;
  updateJob: (id: string, data: Partial<Job>) => void;
  removeJob: (id: string) => void;
  setJobs: (jobs: Job[]) => void;
}

import type { Job } from '@/types';

export const useJobStore = create<JobStore>()((set) => ({
  jobs: [],
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJob: (id, data) =>
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)),
    })),
  removeJob: (id) =>
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),
  setJobs: (jobs) => set({ jobs }),
}));
