'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Film, Clock, HardDrive, RefreshCw } from 'lucide-react';
import { mediaApi } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface MediaLibraryProps {
  onSelect: (mediaId: string, url: string) => void;
}

export function MediaLibrary({ onSelect }: MediaLibraryProps) {
  const { data: mediaItems, isLoading, refetch } = useQuery({
    queryKey: ['media'],
    queryFn: () => mediaApi.list().then(r => r.data),
    refetchInterval: 10000,
  });

  const handleSelect = (item: any) => {
    const mediaUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/uploads/${item.filename}`;
    onSelect(item.id, mediaUrl);
    toast.success(`Loaded: ${item.originalName}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className="text-center py-16">
        <Film className="w-16 h-16 mx-auto text-surface-300 mb-4" />
        <h3 className="text-lg font-semibold mb-1">No media files</h3>
        <p className="text-sm text-surface-500 mb-4">Upload or import a video to get started</p>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-500">{mediaItems.length} file{mediaItems.length !== 1 ? 's' : ''}</p>
        <button onClick={() => refetch()} className="btn-ghost text-xs">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mediaItems.map((item: any, index: number) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => handleSelect(item)}
            className="card-hover p-4 group cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center">
                <Film className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.originalName}</p>
                <p className="text-xs text-surface-500">{formatDate(item.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-surface-500">
              {item.duration && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(item.duration)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {formatFileSize(Number(item.size))}
              </span>
            </div>
            {item.codec && (
              <div className="mt-2 flex gap-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-500 uppercase">
                  {item.codec}
                </span>
                {item.width && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-500">
                    {item.width}x{item.height}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
