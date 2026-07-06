'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ZoomIn, ZoomOut, Scissors, Plus, Trash2, Lock, Unlock,
  Palette, GripVertical, Play, Flag,
} from 'lucide-react';
import { cn, formatDuration, generateId, clamp } from '@/lib/utils';
import { useTimelineStore, usePlayerStore } from '@/lib/store';

interface TimelineProps {
  mediaId: string;
  duration: number;
}

export function Timeline({ mediaId, duration }: TimelineProps) {
  const {
    zoom, setZoom,
    playheadPosition, setPlayheadPosition,
    clips, addClip, removeClip, selectedClipId, selectClip,
    markers, addMarker, removeMarker,
  } = useTimelineStore();

  const { currentTime, isPlaying } = usePlayerStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isDraggingClip, setIsDraggingClip] = useState<string | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(800);
  const [showMarkerMenu, setShowMarkerMenu] = useState(false);

  const pixelsPerSecond = 50 * zoom;
  const totalWidth = Math.max((duration || 120) * pixelsPerSecond, timelineWidth);

  useEffect(() => {
    if (timelineRef.current) {
      setTimelineWidth(timelineRef.current.offsetWidth);
    }
    const handleResize = () => {
      if (timelineRef.current) setTimelineWidth(timelineRef.current.offsetWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isPlaying && duration > 0) {
      setPlayheadPosition((currentTime / duration) * totalWidth);
    }
  }, [currentTime, duration, isPlaying, totalWidth, setPlayheadPosition]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingClip) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0);
    setPlayheadPosition(clamp(x, 0, totalWidth));
    setShowMarkerMenu(false);
  }, [totalWidth, setPlayheadPosition]);

  const handlePlayheadDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
  }, []);

  useEffect(() => {
    if (!isDraggingPlayhead) return;
    const handleMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
      setPlayheadPosition(clamp(x, 0, totalWidth));
    };
    const handleUp = () => setIsDraggingPlayhead(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingPlayhead, totalWidth, setPlayheadPosition]);

  const handleAddMarker = useCallback(() => {
    addMarker(playheadPosition / pixelsPerSecond);
    setShowMarkerMenu(false);
  }, [playheadPosition, pixelsPerSecond, addMarker]);

  const handleAddClip = useCallback(() => {
    const time = playheadPosition / pixelsPerSecond;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const color = colors[clips.length % colors.length];
    addClip(time, Math.min(time + 5, duration || 120), `Clip ${clips.length + 1}`, color);
  }, [playheadPosition, pixelsPerSecond, clips.length, addClip, duration]);

  const createSplitAtPlayhead = useCallback(() => {
    const time = playheadPosition / pixelsPerSecond;
    const existingClip = clips.find(c => c.start < time && c.end > time);
    if (existingClip) {
      removeClip(existingClip.id);
      addClip(existingClip.start, time, `${existingClip.name} (A)`);
      addClip(time, existingClip.end, `${existingClip.name} (B)`);
    }
    addMarker(time);
  }, [playheadPosition, pixelsPerSecond, clips, addClip, removeClip, addMarker]);

  const getTimeFromPosition = (x: number) => clamp(x / pixelsPerSecond, 0, duration || 120);

  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const step = Math.max(1, Math.floor(50 / pixelsPerSecond));
    const total = duration || 120;
    for (let t = 0; t <= total; t += step) {
      markers.push(t);
    }
    return markers;
  }, [pixelsPerSecond, duration]);

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(zoom * 0.8)}
            className="btn-ghost p-1.5"
            disabled={zoom <= 0.2}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-surface-500 w-10 text-center font-medium">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(zoom * 1.25)}
            className="btn-ghost p-1.5"
            disabled={zoom >= 10}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={createSplitAtPlayhead} className="btn-ghost p-1.5 text-xs" title="Split at playhead">
            <Scissors className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Split</span>
          </button>
          <button onClick={handleAddClip} className="btn-ghost p-1.5 text-xs" title="Add clip">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Clip</span>
          </button>
          <button onClick={() => setShowMarkerMenu(!showMarkerMenu)} className="btn-ghost p-1.5 text-xs">
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={timelineRef}
        className="relative overflow-x-auto overflow-y-hidden scrollbar-thin"
        style={{ height: 160 }}
      >
        <div
          className="relative h-full"
          style={{ width: totalWidth }}
          onClick={handleTimelineClick}
        >
          {/* Time Ruler */}
          <div className="absolute top-0 left-0 right-0 h-7 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50">
            {timeMarkers.map((t) => (
              <div
                key={t}
                className="absolute top-0 h-full flex flex-col justify-end pb-1"
                style={{ left: t * pixelsPerSecond }}
              >
                <span className="text-[10px] text-surface-400 px-1">{formatDuration(t)}</span>
                <div className="w-px h-2 bg-surface-300 dark:bg-surface-700" />
              </div>
            ))}
          </div>

          {/* Waveform placeholder area */}
          <div
            className="absolute top-7 bottom-0 left-0 right-0 bg-surface-100/50 dark:bg-surface-900/50"
            style={{ marginTop: 0 }}
          >
            <div className="flex items-center justify-center h-full text-surface-300 text-xs">
              {duration > 0 ? (
                <div className="w-full h-full flex items-center opacity-30">
                  {Array.from({ length: Math.ceil(totalWidth / 4) }).map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-primary-400 mx-0.5 rounded-full"
                      style={{
                        height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 30}%`,
                        opacity: 0.3 + Math.sin(i * 0.3) * 0.3,
                      }}
                    />
                  ))}
                </div>
              ) : (
                'Load video to see waveform'
              )}
            </div>
          </div>

          {/* Clips */}
          {clips.map((clip) => {
            const left = clip.start * pixelsPerSecond;
            const width = (clip.end - clip.start) * pixelsPerSecond;
            return (
              <div
                key={clip.id}
                className={cn(
                  'absolute top-10 rounded-lg cursor-pointer transition-shadow',
                  selectedClipId === clip.id && 'ring-2 ring-primary-500 shadow-lg shadow-primary-500/20',
                )}
                style={{
                  left,
                  width: Math.max(width, 4),
                  height: 60,
                  backgroundColor: clip.color || '#6366f1',
                  opacity: 0.85,
                }}
                onClick={(e) => { e.stopPropagation(); selectClip(clip.id); }}
              >
                <div className="flex items-center gap-1 p-1.5">
                  <span className="text-[10px] text-white font-medium truncate">{clip.name}</span>
                </div>
                <div className="absolute bottom-1 left-1.5 flex items-center gap-1">
                  <span className="text-[9px] text-white/70">{formatDuration(clip.start)}</span>
                  <span className="text-[9px] text-white/40">→</span>
                  <span className="text-[9px] text-white/70">{formatDuration(clip.end)}</span>
                </div>
              </div>
            );
          })}

          {/* Markers */}
          {markers.map((marker, i) => {
            const left = marker.time * pixelsPerSecond;
            return (
              <div
                key={`marker-${i}`}
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 cursor-pointer group/marker"
                style={{ left }}
                onClick={(e) => {
                  e.stopPropagation();
                  removeMarker(marker.time);
                }}
              >
                <div className="absolute -top-0.5 -left-1.5 w-3 h-3 bg-amber-400 rounded-full shadow" />
                <div className="absolute top-0 left-2 bg-amber-400 text-[9px] px-1 py-0.5 rounded text-amber-950 whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity">
                  {formatDuration(marker.time)}
                </div>
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary-500 z-20 cursor-ew-resize group/playhead"
            style={{ left: playheadPosition }}
            onMouseDown={handlePlayheadDrag}
          >
            <div className="absolute -top-0.5 -left-2 w-4 h-4 bg-primary-500 clip-path-triangle shadow-lg" />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/playhead:opacity-100 transition-opacity">
              {formatDuration(getTimeFromPosition(playheadPosition))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
