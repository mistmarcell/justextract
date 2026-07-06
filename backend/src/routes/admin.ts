import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import os from 'os';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate, requireAdmin);

router.get('/dashboard', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [totalUsers, totalJobs, totalMedia, recentJobs] = await Promise.all([
    prisma.user.count(),
    prisma.job.count(),
    prisma.media.count(),
    prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const completedJobs = await prisma.job.count({ where: { status: 'COMPLETED' } });
  const failedJobs = await prisma.job.count({ where: { status: 'FAILED' } });
  const processingJobs = await prisma.job.count({ where: { status: 'PROCESSING' } });

  let storageUsed = 0;
  try {
    const agg = await prisma.media.aggregate({ _sum: { size: true } });
    storageUsed = Number(agg._sum.size || 0);
  } catch {
    storageUsed = 0;
  }

  const cpus = os.cpus();

  res.json({
    stats: {
      totalUsers,
      totalJobs,
      totalMedia,
      completedJobs,
      failedJobs,
      processingJobs,
      storageUsed,
    },
    recentJobs,
    system: {
      platform: process.platform,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(1),
      },
      cpu: {
        cores: cpus.length,
        load: os.loadavg(),
        model: cpus[0]?.model || 'Unknown',
      },
      uptime: os.uptime(),
      hostname: os.hostname(),
      nodeVersion: process.version,
    },
  });
}));

router.get('/users', asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, role: true,
        storageUsed: true, storageLimit: true, createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  res.json({ users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/jobs', asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as string;

  const where: Record<string, any> = {};
  if (status && ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
    where.status = status;
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        media: { select: { originalName: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  res.json({ jobs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/logs', asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.adminLog.count(),
  ]);

  const parsedLogs = logs.map(l => ({
    ...l,
    details: l.details ? JSON.parse(l.details) : null,
  }));

  res.json({ logs: parsedLogs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

router.get('/settings', asyncHandler(async (_req: AuthRequest, res: Response) => {
  const settings = await prisma.systemSetting.findMany();
  const settingsMap: Record<string, any> = {};
  for (const s of settings) {
    try {
      settingsMap[s.key] = JSON.parse(s.value);
    } catch {
      settingsMap[s.key] = s.value;
    }
  }
  res.json(settingsMap);
}));

router.put('/settings', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key is required' });

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });

  await prisma.adminLog.create({
    data: {
      action: 'UPDATE_SETTING',
      userId: req.user!.id,
      details: JSON.stringify({ key, value }),
    },
  });

  res.json(setting);
}));

export { router as adminRoutes };
