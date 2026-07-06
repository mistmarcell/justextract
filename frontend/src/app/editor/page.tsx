'use client';

import { useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, Upload, Cloud, Music, Scissors, Download,
  ChevronDown, Settings, Maximize2, Minimize2,
  PanelLeft, PanelRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { VideoUploader } from '@/components/upload/VideoUploader';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { Timeline } from '@/components/timeline/Timeline';
import { AudioExportPanel } from '@/components/export/AudioExportPanel';
import { VideoExportPanel } from '@/components/export/VideoExportPanel';
import { UrlImporter } from '@/components/upload/UrlImporter';
import { MediaLibrary } from '@/components/upload/MediaLibrary';
import { cn } from '@/lib/utils';
import { useUIStore, useTimelineStore } from '@/lib/store';

type EditorTab = 'upload' | 'url' | 'media';

export default function EditorPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'url' ? 'url' : 'upload';
  const [activeTab, setActiveTab] = useState<EditorTab>(defaultTab);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { exportPanelOpen, setExportPanelOpen, audioPanelOpen, setAudioPanelOpen } = useUIStore();
  const { clips, markers } = useTimelineStore();

  const tabs = [
    { id: 'upload' as const, label: 'Upload', icon: Upload },
    { id: 'url' as const, label: 'URL Import', icon: Cloud },
    { id: 'media' as const, label: 'Media Library', icon: Film },
  ];

  const handleMediaSelect = (mediaId: string, url: string) => {
    setSelectedMediaId(mediaId);
    setVideoUrl(url);
    setShowPlayer(true);
    setShowTimeline(true);
  };

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Media Editor</h1>
            <p className="text-surface-500 text-sm mt-1">Import, edit, and export your media</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAudioPanelOpen(!audioPanelOpen)}
              className={cn('btn-secondary', audioPanelOpen && 'bg-primary-500/10 border-primary-500/30 text-primary-500')}
            >
              <Music className="w-4 h-4" />
              Audio
            </button>
            <button
              onClick={() => setExportPanelOpen(!exportPanelOpen)}
              className={cn('btn-secondary', exportPanelOpen && 'bg-primary-500/10 border-primary-500/30 text-primary-500')}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="btn-ghost"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6 min-w-0">
            {!showPlayer ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-1 mb-4 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl w-fit">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        activeTab === tab.id
                          ? 'bg-white dark:bg-surface-700 shadow-sm text-surface-900 dark:text-white'
                          : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === 'upload' && (
                    <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <VideoUploader onUploadComplete={(id, url) => handleMediaSelect(id, url)} />
                    </motion.div>
                  )}
                  {activeTab === 'url' && (
                    <motion.div key="url" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <UrlImporter onImportComplete={(id, url) => handleMediaSelect(id, url)} />
                    </motion.div>
                  )}
                  {activeTab === 'media' && (
                    <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <MediaLibrary onSelect={(id, url) => handleMediaSelect(id, url)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <VideoPlayer
                  ref={videoRef}
                  src={videoUrl || ''}
                  mediaId={selectedMediaId || ''}
                />

                {showTimeline && (
                  <Timeline
                    mediaId={selectedMediaId || ''}
                    duration={0}
                  />
                )}
              </div>
            )}

            {showPlayer && (
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowPlayer(false); setShowTimeline(false); }} className="btn-secondary">
                  <Upload className="w-4 h-4" />
                  Import Another
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {(audioPanelOpen || exportPanelOpen) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {audioPanelOpen && (
                  <AudioExportPanel mediaId={selectedMediaId || ''} />
                )}
                {exportPanelOpen && (
                  <VideoExportPanel mediaId={selectedMediaId || ''} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
