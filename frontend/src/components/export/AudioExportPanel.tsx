'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Settings, Download, Waves, Sliders } from 'lucide-react';
import { jobApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTimelineStore, useJobStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface AudioExportPanelProps {
  mediaId: string;
}

const formats = [
  { value: 'mp3', label: 'MP3', popular: true },
  { value: 'wav', label: 'WAV' },
  { value: 'aac', label: 'AAC', popular: true },
  { value: 'flac', label: 'FLAC' },
  { value: 'ogg', label: 'OGG' },
  { value: 'm4a', label: 'M4A' },
  { value: 'opus', label: 'OPUS' },
];

const bitrates = [64, 128, 192, 256, 320];
const sampleRates = [44100, 48000, 96000];

export function AudioExportPanel({ mediaId }: AudioExportPanelProps) {
  const [format, setFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState(192);
  const [sampleRate, setSampleRate] = useState(44100);
  const [channels, setChannels] = useState(2);
  const [useSelection, setUseSelection] = useState(false);
  const [normalize, setNormalize] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { clips, playheadPosition } = useTimelineStore();

  const handleExport = async () => {
    if (!mediaId) return toast.error('No media loaded');

    setExporting(true);
    setProgress(0);

    const data: any = {
      mediaId,
      format,
      bitrate,
      sampleRate,
      channels,
      normalize,
    };

    if (useSelection && clips.length > 0) {
      data.startTime = clips[0].start;
      data.endTime = clips[0].end;
    }

    try {
      const res = await jobApi.extractAudio(data);
      const jobId = res.data.job.id;
      toast.success('Audio extraction started');

      const socket = (await import('@/lib/socket')).getSocket();
      socket.emit('subscribe:job', jobId);

      socket.on('job:progress', (data: any) => {
        if (data.jobId === jobId) setProgress(data.progress);
      });

      socket.on('job:complete', (data: any) => {
        if (data.jobId === jobId) {
          setProgress(100);
          toast.success('Audio extraction complete!');
          setExporting(false);
        }
      });

      socket.on('job:error', (data: any) => {
        if (data.jobId === jobId) {
          toast.error(data.error || 'Extraction failed');
          setExporting(false);
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start extraction');
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold">Audio Extraction</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="label">Format</label>
          <div className="grid grid-cols-4 gap-1.5">
            {formats.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  format === f.value
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                )}
              >
                {f.label.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {format !== 'wav' && format !== 'flac' && (
          <div>
            <label className="label">Bitrate</label>
            <div className="flex gap-1.5">
              {bitrates.map((b) => (
                <button
                  key={b}
                  onClick={() => setBitrate(b)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                    bitrate === b
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                  )}
                >
                  {b}k
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label">Sample Rate</label>
          <div className="flex gap-1.5">
            {sampleRates.map((sr) => (
              <button
                key={sr}
                onClick={() => setSampleRate(sr)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  sampleRate === sr
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                )}
              >
                {sr / 1000}kHz
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Channels</label>
          <div className="flex gap-1.5">
            <button
              onClick={() => setChannels(1)}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                channels === 1
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
              )}
            >
              Mono
            </button>
            <button
              onClick={() => setChannels(2)}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                channels === 2
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
              )}
            >
              Stereo
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useSelection}
              onChange={(e) => setUseSelection(e.target.checked)}
              className="rounded border-surface-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm">Use timeline selection</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={normalize}
              onChange={(e) => setNormalize(e.target.checked)}
              className="rounded border-surface-300 text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm">Normalize volume (LUFS)</span>
          </label>
        </div>

        {exporting && <ProgressBar value={progress} showLabel variant="success" />}

        <Button onClick={handleExport} loading={exporting} className="w-full" disabled={!mediaId}>
          <Download className="w-4 h-4" />
          {exporting ? 'Extracting...' : 'Extract Audio'}
        </Button>
      </CardContent>
    </Card>
  );
}
