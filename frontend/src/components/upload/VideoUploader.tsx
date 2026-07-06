'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Film, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { uploadApi, mediaApi } from '@/lib/api';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn, formatFileSize, isVideoFile } from '@/lib/utils';
import toast from 'react-hot-toast';

interface VideoUploaderProps {
  onUploadComplete: (mediaId: string, url: string) => void;
}

export function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [files, setFiles] = useState<Array<{ file: File; progress: number; status: 'pending' | 'uploading' | 'done' | 'error'; mediaId?: string }>>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(f => isVideoFile(f.name));
    if (validFiles.length === 0) {
      toast.error('Please upload valid video files (MP4, MOV, AVI, etc.)');
      return;
    }

    const newFiles = validFiles.map(f => ({ file: f, progress: 0, status: 'pending' as const }));
    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const index = files.length + i;

      setFiles(prev => prev.map((f, idx) => idx === index ? { ...f, status: 'uploading' } : f));

      try {
        const res = await uploadApi.upload([file], (progress) => {
          setFiles(prev => prev.map((f, idx) =>
            idx === index ? { ...f, progress } : f
          ));
        });

        const media = res.data.files[0];
        const mediaUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:4000'}/uploads/${media.filename}`;

        setFiles(prev => prev.map((f, idx) =>
          idx === index ? { ...f, status: 'done', progress: 100, mediaId: media.id } : f
        ));

        toast.success(`${file.name} uploaded successfully`);

        mediaApi.getMetadata(media.id).catch(() => {});

        setTimeout(() => {
          onUploadComplete(media.id, mediaUrl);
        }, 500);
      } catch (error: any) {
        setFiles(prev => prev.map((f, idx) =>
          idx === index ? { ...f, status: 'error' } : f
        ));
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [files.length, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4', '.m4v'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/x-matroska': ['.mkv'],
      'video/webm': ['.webm'],
      'video/x-flv': ['.flv'],
      'video/mpeg': ['.mpeg', '.mpg'],
      'video/mp2t': ['.ts'],
      'video/3gpp': ['.3gp'],
    },
    maxSize: 2 * 1024 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 group',
          isDragActive
            ? 'border-primary-500 bg-primary-500/5 scale-[1.02]'
            : 'border-surface-300 dark:border-surface-700 hover:border-primary-500/50 hover:bg-surface-50 dark:hover:bg-surface-800/50'
        )}
      >
        <input {...getInputProps()} />
        <motion.div
          animate={{ scale: isDragActive ? 1.1 : 1 }}
          className="space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-primary-500" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {isDragActive ? 'Drop your files here' : 'Upload your video'}
            </p>
            <p className="text-sm text-surface-500 mt-1">
              Drag & drop or click to browse
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-surface-400">
            <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">MP4</span>
            <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">MOV</span>
            <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">AVI</span>
            <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">MKV</span>
            <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">WEBM</span>
            <span className="px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800">+ more</span>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {files.map((file, index) => (
          <motion.div
            key={`${file.file.name}-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card p-4"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                file.status === 'done' ? 'bg-emerald-500/10' :
                file.status === 'error' ? 'bg-red-500/10' :
                'bg-primary-500/10'
              )}>
                {file.status === 'done' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> :
                 file.status === 'error' ? <AlertCircle className="w-5 h-5 text-red-500" /> :
                 <Film className="w-5 h-5 text-primary-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-surface-500">{formatFileSize(file.file.size)}</p>
                {file.status === 'uploading' && (
                  <ProgressBar value={file.progress} size="sm" className="mt-2" />
                )}
              </div>
              <button onClick={() => removeFile(index)} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
