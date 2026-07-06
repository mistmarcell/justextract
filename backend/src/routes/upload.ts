import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await fs.mkdir(config.storage.uploadDir, { recursive: true });
    cb(null, config.storage.uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (config.supportedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(400, `Unsupported format: ${ext}`, 'UNSUPPORTED_FORMAT'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.storage.maxFileSize,
    files: 10,
  },
});

router.post('/', optionalAuth, upload.array('files', 10), asyncHandler(async (req: AuthRequest, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError(400, 'No files uploaded', 'NO_FILES');
  }

  const results = [];

  for (const file of files) {
    const stat = await fs.stat(file.path);
    const media = await prisma.media.create({
      data: {
        userId: req.user?.id || null,
        originalName: file.originalname,
        filename: file.filename,
        mimeType: file.mimetype,
        size: Number(stat.size),
        source: 'upload',
      },
    });

    results.push(media);
  }

  res.status(201).json({ files: results });
}));

router.post('/chunk', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { chunk, chunkIndex, totalChunks, filename, uploadId } = req.body;
  const uploadDir = path.join(config.storage.uploadDir, 'chunks', uploadId);
  await fs.mkdir(uploadDir, { recursive: true });

  const chunkPath = path.join(uploadDir, `chunk_${chunkIndex}`);
  await fs.writeFile(chunkPath, Buffer.from(chunk, 'base64'));

  if (chunkIndex === totalChunks - 1) {
    const ext = path.extname(filename);
    const finalName = `${uploadId}${ext}`;
    const finalPath = path.join(config.storage.uploadDir, finalName);

    const writeStream = require('fs').createWriteStream(finalPath);
    for (let i = 0; i < totalChunks; i++) {
      const chunkData = await fs.readFile(path.join(uploadDir, `chunk_${i}`));
      writeStream.write(chunkData);
    }
    writeStream.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    await fs.rm(uploadDir, { recursive: true, force: true });

    const stat = await fs.stat(finalPath);
    const media = await prisma.media.create({
      data: {
        userId: req.user?.id || null,
        originalName: filename,
        filename: finalName,
        mimeType: `video/${ext.replace('.', '')}`,
        size: Number(stat.size),
        source: 'upload',
      },
    });

    return res.status(201).json({ media });
  }

  res.json({ received: chunkIndex, total: totalChunks });
}));

export { router as uploadRoutes };
