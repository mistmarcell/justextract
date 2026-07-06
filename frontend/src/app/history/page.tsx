'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Clock, Music, Scissors, Film, Download, RefreshCw,
  Trash2, Play, ExternalLink, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { jobApi } from '@/lib/api';
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const typeIcons: Record<string, React.ElementType> = {
  AUDIO_EXTRACT: Music,
  VIDEO_SPLIT: Scissors,
  CLIP_EXPORT: Film,
  AUDIO_EXPORT: Music,
  URL_IMPORT: Download,
};

const statusColors: Record<string, string> = {
  COMPLETED: 'badge-success',
  PROCESSING: 'badge-warning',
  FAILED: 'badge-error',
  CANCELLED: 'badge-info',
  PENDING: 'badge-info',
  QUEUED: 'badge-info',
};

export default function HistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['job-history', page],
    queryFn: () => jobApi.history(page).then(r => r.data),
  });

  const jobs = data?.jobs || [];
  const pagination = data?.pagination;

  const handleDownload = async (jobId: string) => {
    try {
      const res = await jobApi.download(jobId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `justextract-${jobId}.${res.data.type?.split('/')[1] || 'mp4'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await jobApi.retry(jobId);
      toast.success('Job queued for retry');
      refetch();
    } catch {
      toast.error('Failed to retry job');
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Job History</h1>
            <p className="text-surface-500 text-sm mt-1">View and manage your processing jobs</p>
          </div>
          <button onClick={() => refetch()} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-16 h-16 mx-auto text-surface-300 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No jobs yet</h3>
                <p className="text-sm text-surface-500">Process your first video to see history here</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {jobs.map((job: any, index: number) => {
                  const Icon = typeIcons[job.type] || Film;
                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-4 p-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-surface-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium capitalize">
                            {job.type.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <span className={statusColors[job.status] || 'badge'}>
                            {job.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-surface-500 mt-0.5">
                          <span>{formatDate(job.createdAt)}</span>
                          {job.media?.originalName && (
                            <span className="truncate max-w-[200px]">{job.media.originalName}</span>
                          )}
                          {job.outputSize && <span>{formatFileSize(Number(job.outputSize))}</span>}
                        </div>
                        {job.status === 'PROCESSING' && (
                          <div className="mt-2 w-full max-w-xs h-1 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
                          </div>
                        )}
                        {job.error && (
                          <p className="text-xs text-red-500 mt-1">{job.error}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {job.status === 'COMPLETED' && (
                          <button onClick={() => handleDownload(job.id)} className="btn-ghost p-1.5">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {(job.status === 'FAILED' || job.status === 'CANCELLED') && (
                          <button onClick={() => handleRetry(job.id)} className="btn-ghost p-1.5">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-surface-500 px-3">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="btn-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
