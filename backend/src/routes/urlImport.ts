import { Router, Response } from 'express';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { fetchUrlMetadata, downloadFromUrl } from '../utils/urlDownloader';

const router = Router();
const prisma = new PrismaClient();

const urlSchema = z.object({
  url: z.string().url(),
});

router.post('/metadata', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { url } = urlSchema.parse(req.body);
  const metadata = await fetchUrlMetadata(url);
  res.json(metadata);
}));

router.post('/download', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { url } = urlSchema.parse(req.body);
  const jobId = uuidv4();

  const job = await prisma.job.create({
    data: {
      id: jobId,
      userId: req.user?.id || null,
      type: 'URL_IMPORT',
      status: 'PROCESSING',
      params: JSON.stringify({ url }),
    },
  });

  downloadFromUrl(url, jobId, (progress) => {
    prisma.job.update({
      where: { id: jobId },
      data: { progress },
    }).catch(() => {});
  })
    .then(async (filePath) => {
      const stat = await require('fs').promises.stat(filePath);
      const media = await prisma.media.create({
        data: {
          userId: req.user?.id || null,
          originalName: path.basename(filePath),
          filename: path.basename(filePath),
          mimeType: `video/${path.extname(filePath).replace('.', '')}`,
          size: Number(stat.size),
          source: 'url',
          url,
        },
      });

      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          mediaId: media.id,
          outputPath: filePath,
          completedAt: new Date(),
          output: JSON.stringify({ mediaId: media.id }),
        },
      });

      const io = req.app.get('io');
      io.to(`job:${jobId}`).emit('job:complete', { jobId, status: 'COMPLETED', media });
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

export { router as urlImportRoutes };
