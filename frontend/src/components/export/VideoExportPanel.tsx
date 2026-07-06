'use client';

import { useState } from 'react';
import { Download, Film, Settings } from 'lucide-react';
import { jobApi } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTimelineStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface VideoExportPanelProps {
  mediaId: string;
}

const formats = [
  { value: 'mp4', label: 'MP4', popular: true },
  { value: 'mov', label: 'MOV' },
  { value: 'webm', label: 'WEBM' },
  { value: 'mkv', label: 'MKV' },
];

const codecs = [
  { value: 'h264', label: 'H.264', popular: true },
  { value: 'h265', label: 'H.265' },
  { value: 'av1', label: 'AV1' },
  { value: 'vp9', label: 'VP9' },
];

const resolutions = [
  { value: 'original', label: 'Original' },
  { value: '2160', label: '4K' },
  { value: '1440', label: '1440p' },
  { value: '1080', label: '1080p', popular: true },
  { value: '720', label: '720p' },
  { value: '480', label: '480p' },
];

const fpsOptions = [
  { value: 'original', label: 'Original' },
  { value: '24', label: '24' },
  { value: '30', label: '30', popular: true },
  { value: '60', label: '60' },
];

export function VideoExportPanel({ mediaId }: VideoExportPanelProps) {
  const [format, setFormat] = useState('mp4');
  const [codec, setCodec] = useState('h264');
  const [resolution, setResolution] = useState('original');
  const [fps, setFps] = useState('original');
  const [useClips, setUseClips] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { clips } = useTimelineStore();

  const handleExport = async () => {
    if (!mediaId) return toast.error('No media loaded');

    setExporting(true);
    setProgress(0);

    const markers = useClips && clips.length > 0
      ? clips.map(c => ({ start: c.start, end: c.end, name: c.name }))
      : clips.length > 0
        ? clips.map(c => ({ start: c.start, end: c.end, name: c.name }))
        : [{ start: 0, end: 0 }];

    try {
      const res = await jobApi.splitVideo({
        mediaId,
        markers,
        format,
        codec,
        resolution,
        fps,
      });
      const jobId = res.data.job.id;
      toast.success('Export started');

      const socket = (await import('@/lib/socket')).getSocket();
      socket.emit('subscribe:job', jobId);

      socket.on('job:progress', (data: any) => {
        if (data.jobId === jobId) setProgress(data.progress);
      });

      socket.on('job:complete', (data: any) => {
        if (data.jobId === jobId) {
          setProgress(100);
          toast.success('Export complete!');
          setExporting(false);
        }
      });

      socket.on('job:error', (data: any) => {
        if (data.jobId === jobId) {
          toast.error(data.error || 'Export failed');
          setExporting(false);
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start export');
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Film className="w-5 h-5 text-primary-500" />
          <h3 className="font-semibold">Video Export</h3>
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
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Codec</label>
          <div className="grid grid-cols-2 gap-1.5">
            {codecs.map((c) => (
              <button
                key={c.value}
                onClick={() => setCodec(c.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  codec === c.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Resolution</label>
          <div className="grid grid-cols-3 gap-1.5">
            {resolutions.map((r) => (
              <button
                key={r.value}
                onClick={() => setResolution(r.value)}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  resolution === r.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">FPS</label>
          <div className="flex gap-1.5">
            {fpsOptions.map((f) => (
              <button
                key={f.value}
                onClick={() => setFps(f.value)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  fps === f.value
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useClips}
            onChange={(e) => setUseClips(e.target.checked)}
            className="rounded border-surface-300 text-primary-500 focus:ring-primary-500"
          />
          <span className="text-sm">Export timeline clips only</span>
        </label>

        {exporting && <ProgressBar value={progress} showLabel variant="success" />}

        <Button onClick={handleExport} loading={exporting} className="w-full" disabled={!mediaId}>
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export Video'}
        </Button>
      </CardContent>
    </Card>
  );
}
