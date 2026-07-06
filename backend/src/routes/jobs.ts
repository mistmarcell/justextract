import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ffmpegService } from '../services/ffmpeg';

const router = Router();
const prisma = new PrismaClient();

const extractAudioSchema = z.object({
  mediaId: z.string(),
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
  format: z.enum(['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'opus']),
  bitrate: z.number().optional(),
  sampleRate: z.number().optional(),
  channels: z.number().min(1).max(2).optional(),
  normalize: z.boolean().optional(),
});

const splitVideoSchema = z.object({
  mediaId: z.string(),
  markers: z.array(z.object({
    start: z.number(),
    end: z.number(),
    name: z.string().optional(),
  })).min(1),
  format: z.enum(['mp4', 'mov', 'webm', 'mkv']).default('mp4'),
  codec: z.enum(['h264', 'h265', 'av1', 'vp9']).optional(),
  resolution: z.enum(['original', '2160', '1440', '1080', '720', '480']).optional(),
  fps: z.enum(['original', '24', '30', '60']).optional(),
});

router.post('/extract-audio', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = extractAudioSchema.parse(req.body);
  const media = await prisma.media.findUnique({ where: { id: data.mediaId } });
  if (!media) throw new AppError(404, 'Media not found', 'NOT_FOUND');

  const inputPath = path.join(config.storage.uploadDir, media.filename);
  const jobId = uuidv4();
  const duration = data.endTime && data.startTime !== undefined
    ? data.endTime - data.startTime
    : undefined;

  const job = await prisma.job.create({
    data: {
      id: jobId,
      userId: req.user?.id || null,
      mediaId: media.id,
      type: 'AUDIO_EXTRACT',
      status: 'PROCESSING',
      params: JSON.stringify(data),
    },
  });

  ffmpegService.extractAudio(inputPath, {
    startTime: data.startTime,
    duration,
    format: data.format,
    bitrate: data.bitrate,
    sampleRate: data.sampleRate,
    channels: data.channels,
    normalize: data.normalize,
  }, jobId)
    .then(async (outputPath) => {
      const stat = await fs.stat(outputPath);
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          outputPath,
          outputSize: Number(stat.size),
          completedAt: new Date(),
          output: JSON.stringify({ path: outputPath, format: data.format }),
        },
      });

      const io = req.app.get('io');
      io.to(`job:${jobId}`).emit('job:complete', { jobId, status: 'COMPLETED', outputPath });
    })
    .catch(async (error) => {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: error.message, completedAt: new Date() },
      });

      const io = req.app.get('io');
      io.to(`job:${jobId}`).emit('job:error', { jobId, error: error.message });
    });

  res.status(202).json({ job });
}));

router.post('/split-video', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = splitVideoSchema.parse(req.body);
  const media = await prisma.media.findUnique({ where: { id: data.mediaId } });
  if (!media) throw new AppError(404, 'Media not found', 'NOT_FOUND');

  const inputPath = path.join(config.storage.uploadDir, media.filename);
  const jobId = uuidv4();

  await fs.access(inputPath).catch(() => {
    throw new AppError(404, 'File not found on disk', 'FILE_NOT_FOUND');
  });

  const job = await prisma.job.create({
    data: {
      id: jobId,
      userId: req.user?.id || null,
      mediaId: media.id,
      type: 'VIDEO_SPLIT',
      status: 'PROCESSING',
      params: JSON.stringify(data),
    },
  });

  ffmpegService.splitVideo(inputPath, data.markers, {
    format: data.format,
    codec: data.codec,
    resolution: data.resolution,
    fps: data.fps,
  }, jobId)
    .then(async (outputPaths) => {
      let totalSize = 0;
      for (const p of outputPaths) {
        const stat = await fs.stat(p).catch(() => ({ size: 0 }));
        totalSize += Number(stat.size);
      }

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          outputPath: path.dirname(outputPaths[0]),
          outputSize: totalSize,
          completedAt: new Date(),
          output: JSON.stringify({ paths: outputPaths, format: data.format }),
        },
      });

      const io = req.app.get('io');
      io.to(`job:${jobId}`).emit('job:complete', { jobId, status: 'COMPLETED', outputPaths });
    })
    .catch(async (error) => {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: error.message, completedAt: new Date() },
      });

      const io = req.app.get('io');
      io.to(`job:${jobId}`).emit('job:error', { jobId, error: error.message });
    });

  res.status(202).json({ job });
}));

router.get('/history', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, any> = {};
  if (req.user) {
    where.userId = req.user.id;
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        media: { select: { originalName: true, thumbnail: true, duration: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  const parsedJobs = jobs.map(j => ({
    ...j,
    params: j.params ? JSON.parse(j.params) : null,
    output: j.output ? JSON.parse(j.output) : null,
  }));

  res.json({
    jobs: parsedJobs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await prisma.job.findUnique({
    where: { id: req.params.id },
    include: { media: true },
  });

  if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

  res.json({
    ...job,
    params: job.params ? JSON.parse(job.params) : null,
    output: job.output ? JSON.parse(job.output) : null,
  });
}));

router.get('/:id/download', asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job || !job.outputPath) throw new AppError(404, 'Output not found', 'NOT_FOUND');

  const filePath = job.outputPath;
  try {
    await fs.access(filePath);
    const name = path.basename(filePath);
    res.download(filePath, name);
  } catch {
    throw new AppError(404, 'File not found', 'FILE_NOT_FOUND');
  }
}));

router.post('/:id/cancel', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');

  const cancelled = ffmpegService.cancelJob(job.id);

  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'CANCELLED', completedAt: new Date() },
  });

  const io = req.app.get('io');
  io.to(`job:${job.id}`).emit('job:cancelled', { jobId: job.id });

  res.json({ cancelled });
}));

router.post('/:id/retry', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job) throw new AppError(404, 'Job not found', 'NOT_FOUND');
  if (job.status !== 'FAILED' && job.status !== 'CANCELLED') {
    throw new AppError(400, 'Can only retry failed or cancelled jobs', 'INVALID_STATUS');
  }

  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'PENDING', progress: 0, error: null, completedAt: null },
  });

  res.json({ retried: true, jobId: job.id });
}));

export { router as jobRoutes };
