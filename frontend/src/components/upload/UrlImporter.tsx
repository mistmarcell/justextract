'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, Globe, Download, Film, Clock, Image, AlertCircle } from 'lucide-react';
import { urlImportApi, mediaApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { isValidUrl, formatDuration } from '@/lib/utils';
import type { UrlMetadata } from '@/types';
import toast from 'react-hot-toast';

interface UrlImporterProps {
  onImportComplete: (mediaId: string, url: string) => void;
}

export function UrlImporter({ onImportComplete }: UrlImporterProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<UrlMetadata | null>(null);
  const [error, setError] = useState('');

  const handleFetchMetadata = async () => {
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await urlImportApi.getMetadata(url);
      setMetadata(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch metadata');
      toast.error('Failed to fetch URL metadata');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setProgress(0);

    try {
      const res = await urlImportApi.download(url);

      const jobId = res.data.job.id;
      toast.success('Download started');

      const socket = (await import('@/lib/socket')).getSocket();
      socket.emit('subscribe:job', jobId);

      socket.on('job:progress', (data: any) => {
        if (data.jobId === jobId) setProgress(data.progress);
      });

      socket.on('job:complete', async (data: any) => {
        if (data.jobId === jobId) {
          setProgress(100);
          toast.success('Download complete');

          const mediaUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/uploads/${data.media.filename}`;
          mediaApi.getMetadata(data.media.id).catch(() => {});
          onImportComplete(data.media.id, mediaUrl);
        }
      });

      socket.on('job:error', (data: any) => {
        if (data.jobId === jobId) {
          toast.error(data.error || 'Download failed');
          setDownloading(false);
        }
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start download');
      setDownloading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFetchMetadata();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste video URL (YouTube, Vimeo, MP4, etc.)"
              className="input-field pl-10"
            />
          </div>
          <Button onClick={handleFetchMetadata} loading={loading}>
            <Globe className="w-4 h-4" />
            Fetch
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>

      <AnimatePresence>
        {metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="card overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row">
              {metadata.thumbnail && (
                <div className="sm:w-48 h-32 bg-surface-100 dark:bg-surface-800 flex-shrink-0">
                  <img
                    src={metadata.thumbnail}
                    alt={metadata.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="p-5 flex-1 space-y-3">
                <h3 className="font-semibold line-clamp-2">{metadata.title || 'Unknown'}</h3>
                <div className="flex items-center gap-4 text-sm text-surface-500">
                  {metadata.duration > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDuration(metadata.duration)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Download className="w-3.5 h-3.5" />
                    {metadata.formats.length} quality options
                  </span>
                </div>
                {downloading ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-surface-500">
                      <span>Downloading...</span>
                      <span>{progress}%</span>
                    </div>
                    <ProgressBar value={progress} />
                  </div>
                ) : (
                  <Button onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                    Download & Import
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-xs text-surface-400 space-y-1">
        <p>Supported sources:</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800">YouTube</span>
          <span className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800">Vimeo</span>
          <span className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800">Direct MP4/WebM</span>
          <span className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800">Google Drive</span>
          <span className="px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800">Dropbox</span>
        </div>
      </div>
    </div>
  );
}
