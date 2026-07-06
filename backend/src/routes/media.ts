import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ffmpegService } from '../services/ffmpeg';

const router = Router();
const prisma = new PrismaClient();

router.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: Record<string, any> = {};
  if (req.user) {
    where.userId = req.user.id;
  }

  const media = await prisma.media.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const parsed = media.map(m => ({
    ...m,
    metadata: m.metadata ? JSON.parse(m.metadata) : null,
  }));

  res.json(parsed);
}));

router.get('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const media = await prisma.media.findUnique({
    where: { id: req.params.id },
    include: { jobs: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });

  if (!media) throw new AppError(404, 'Media not found', 'NOT_FOUND');

  res.json({
    ...media,
    metadata: media.metadata ? JSON.parse(media.metadata) : null,
  });
}));

router.post('/:id/metadata', asyncHandler(async (req: AuthRequest, res: Response) => {
  const media = await prisma.media.findUnique({ where: { id: req.params.id } });
  if (!media) throw new AppError(404, 'Media not found', 'NOT_FOUND');

  const filePath = path.join(config.storage.uploadDir, media.filename);
  try {
    await fs.access(filePath);
  } catch {
    throw new AppError(404, 'File not found on disk', 'FILE_NOT_FOUND');
  }

  const metadata = await ffmpegService.getMetadata(filePath);

  await prisma.media.update({
    where: { id: media.id },
    data: {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      codec: metadata.codec,
      bitrate: metadata.bitrate,
      audioCodec: metadata.audioCodec,
      audioChannels: metadata.audioChannels,
      sampleRate: metadata.sampleRate,
      metadata: JSON.stringify(metadata),
    },
  });

  res.json(metadata);
}));

router.post('/:id/waveform', asyncHandler(async (req: AuthRequest, res: Response) => {
  const media = await prisma.media.findUnique({ where: { id: req.params.id } });
  if (!media) throw new AppError(404, 'Media not found', 'NOT_FOUND');

  const filePath = path.join(config.storage.uploadDir, media.filename);
  const jobId = `waveform_${media.id}`;

  const outputPath = await ffmpegService.generateWaveform(filePath, jobId);
  const waveformUrl = `/outputs/${jobId}/waveform.png`;

  res.json({ waveformUrl });
}));

router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const media = await prisma.media.findUnique({ where: { id: req.params.id } });
  if (!media) throw new AppError(404, 'Media not found', 'NOT_FOUND');

  if (media.userId && media.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError(403, 'Not authorized', 'FORBIDDEN');
  }

  const filePath = path.join(config.storage.uploadDir, media.filename);
  await fs.unlink(filePath).catch(() => {});

  await prisma.media.delete({ where: { id: media.id } });
  res.json({ deleted: true });
}));

export { router as mediaRoutes };
