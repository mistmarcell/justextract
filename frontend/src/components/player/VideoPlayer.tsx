'use client';

import { forwardRef, useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, ChevronUp, ChevronDown,
  Settings, Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/lib/store';
import { formatDuration } from '@/lib/utils';

interface VideoPlayerProps {
  src: string;
  mediaId: string;
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, mediaId }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showControls, setShowControls] = useState(true);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [hovering, setHovering] = useState(false);
    const controlsTimeout = useRef<NodeJS.Timeout>();
    const [thumbnailPreview, setThumbnailPreview] = useState<{ x: number; time: number } | null>(null);

    const {
      isPlaying, currentTime, duration, volume, playbackRate,
      isFullscreen, isMuted,
      setPlaying, setCurrentTime, setDuration, setVolume,
      setPlaybackRate, setFullscreen, setMuted,
    } = usePlayerStore();

    const video = videoRef.current;

    useEffect(() => {
      const el = videoRef.current;
      if (!el) return;

      const onTimeUpdate = () => setCurrentTime(el.currentTime);
      const onDurationChange = () => setDuration(el.duration || 0);
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      const onEnded = () => setPlaying(false);

      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('durationchange', onDurationChange);
      el.addEventListener('play', onPlay);
      el.addEventListener('pause', onPause);
      el.addEventListener('ended', onEnded);

      return () => {
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.removeEventListener('durationchange', onDurationChange);
        el.removeEventListener('play', onPlay);
        el.removeEventListener('pause', onPause);
        el.removeEventListener('ended', onEnded);
      };
    }, [setCurrentTime, setDuration, setPlaying]);

    const togglePlay = useCallback(() => {
      if (!video) return;
      if (video.paused) video.play();
      else video.pause();
    }, [video]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!video) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      video.currentTime = x * duration;
    }, [video, duration]);

    const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!video) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.volume = x;
      setVolume(x);
      setMuted(x === 0);
    }, [video, setVolume, setMuted]);

    const toggleFullscreen = useCallback(async () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    }, [setFullscreen]);

    const stepFrame = useCallback((direction: 1 | -1) => {
      if (!video) return;
      video.pause();
      video.currentTime += (1 / 30) * direction;
    }, [video]);

    const changeSpeed = useCallback((rate: number) => {
      if (!video) return;
      video.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    }, [video, setPlaybackRate]);

    const showControlsTemporarily = useCallback(() => {
      setShowControls(true);
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      if (isPlaying) {
        controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
      }
    }, [isPlaying]);

    const handleSeekHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      setThumbnailPreview({ x: e.clientX - rect.left, time: x * duration });
    }, [duration]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement) return;
        switch (e.key) {
          case ' ':
            e.preventDefault();
            togglePlay();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (video) video.currentTime -= 5;
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (video) video.currentTime += 5;
            break;
          case 'f':
          case 'F':
            toggleFullscreen();
            break;
          case 'm':
          case 'M':
            if (video) { video.muted = !video.muted; setMuted(video.muted); }
            break;
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, toggleFullscreen, video, setMuted]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

    return (
      <div
        ref={containerRef}
        className="relative bg-black rounded-2xl overflow-hidden group"
        onMouseMove={showControlsTemporarily}
        onMouseEnter={() => { setHovering(true); showControlsTemporarily(); }}
        onMouseLeave={() => { setHovering(false); if (isPlaying) setShowControls(false); setShowSpeedMenu(false); setThumbnailPreview(null); }}
      >
        <video
          ref={videoRef}
          src={src}
          className="w-full aspect-video object-contain cursor-pointer"
          onClick={togglePlay}
          playsInline
          preload="metadata"
        />

        <motion.div
          animate={{ opacity: showControls || !isPlaying ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none"
        />

        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 p-4 pt-12 transition-opacity duration-300',
            (showControls || !isPlaying) ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div
            className="relative h-1 bg-white/20 rounded-full cursor-pointer mb-3 group/seek"
            onClick={handleSeek}
            onMouseMove={handleSeekHover}
            onMouseLeave={() => setThumbnailPreview(null)}
          >
            <div className="absolute left-0 top-0 h-full bg-primary-500 rounded-full" style={{ width: `${progress}%` }} />
            <div className="absolute h-3 w-3 bg-white rounded-full -translate-y-1/2 top-1/2 shadow-lg" style={{ left: `${progress}%` }} />
            {thumbnailPreview && (
              <div
                className="absolute -top-10 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded"
                style={{ left: thumbnailPreview.x }}
              >
                {formatDuration(thumbnailPreview.time)}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} className="text-white hover:text-primary-400 transition-colors p-1">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={() => stepFrame(-1)} className="text-white/70 hover:text-white transition-colors p-1">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => stepFrame(1)} className="text-white/70 hover:text-white transition-colors p-1">
                <SkipForward className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => { if (video) { video.muted = !video.muted; setMuted(video.muted); } }}
                  className="text-white/70 hover:text-white transition-colors p-1"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="w-20 h-1 bg-white/20 rounded-full cursor-pointer relative" onClick={handleVolumeChange}>
                  <div className="absolute left-0 top-0 h-full bg-white rounded-full" style={{ width: `${volume * 100}%` }} />
                </div>
              </div>

              <span className="text-white/70 text-xs ml-3 tabular-nums">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="text-white/70 hover:text-white transition-colors px-2 py-1 text-xs font-medium"
                >
                  {playbackRate}x
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-surface-900 rounded-xl p-1 shadow-2xl border border-white/10 min-w-[100px]">
                    {speeds.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={cn(
                          'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors',
                          speed === playbackRate
                            ? 'bg-primary-500/20 text-primary-400'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors p-1">
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
