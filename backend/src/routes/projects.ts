import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const createProjectSchema = z.object({
  title: z.string().min(1).max(100).default('Untitled Project'),
});

const updateProjectSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  state: z.any().optional(),
  thumbnail: z.string().optional(),
});

router.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const where: Record<string, any> = {};
  if (req.user) {
    where.userId = req.user.id;
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: {
      media: { take: 1, select: { thumbnail: true, duration: true } },
      _count: { select: { clips: true, markers: true } },
    },
  });

  const parsed = projects.map(p => ({
    ...p,
    state: p.state ? JSON.parse(p.state) : null,
  }));

  res.json(parsed);
}));

router.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      media: true,
      clips: { orderBy: { order: 'asc' } },
      markers: true,
    },
  });

  if (!project) throw new AppError(404, 'Project not found', 'NOT_FOUND');

  res.json({
    ...project,
    state: project.state ? JSON.parse(project.state) : null,
  });
}));

router.post('/', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = createProjectSchema.parse(req.body);
  const defaultState = JSON.stringify({
    timelineZoom: 1,
    playheadPosition: 0,
    markers: [],
    clips: [],
  });

  const project = await prisma.project.create({
    data: {
      userId: req.user?.id || null,
      title: data.title,
      state: defaultState,
    },
  });

  res.status(201).json({
    ...project,
    state: JSON.parse(project.state!),
  });
}));

router.put('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = updateProjectSchema.parse(req.body);
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) throw new AppError(404, 'Project not found', 'NOT_FOUND');

  const updateData: Record<string, any> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
  if (data.state !== undefined) updateData.state = JSON.stringify(data.state);

  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: updateData,
  });

  const io = req.app.get('io');
  io.to(`project:${project.id}`).emit('project:state', data.state || JSON.parse(project.state || '{}'));

  res.json({
    ...updated,
    state: updated.state ? JSON.parse(updated.state) : null,
  });
}));

router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) throw new AppError(404, 'Project not found', 'NOT_FOUND');

  if (project.userId && project.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError(403, 'Not authorized', 'FORBIDDEN');
  }

  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ deleted: true });
}));

router.post('/:id/clips', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().optional(),
    startTime: z.number().min(0),
    endTime: z.number().min(0),
    color: z.string().optional(),
  });

  const data = schema.parse(req.body);
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) throw new AppError(404, 'Project not found', 'NOT_FOUND');

  const maxOrder = await prisma.clip.findFirst({
    where: { projectId: project.id },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  const clip = await prisma.clip.create({
    data: {
      projectId: project.id,
      name: data.name || `Clip ${(maxOrder?.order || 0) + 1}`,
      startTime: data.startTime,
      endTime: data.endTime,
      color: data.color,
      order: (maxOrder?.order || 0) + 1,
    },
  });

  res.status(201).json(clip);
}));

router.put('/clips/:clipId', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().optional(),
    startTime: z.number().min(0).optional(),
    endTime: z.number().min(0).optional(),
    color: z.string().optional(),
    locked: z.boolean().optional(),
    order: z.number().optional(),
  });

  const data = schema.parse(req.body);
  const clip = await prisma.clip.update({
    where: { id: req.params.clipId },
    data,
  });

  res.json(clip);
}));

router.delete('/clips/:clipId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.clip.delete({ where: { id: req.params.clipId } });
  res.json({ deleted: true });
}));

router.post('/:id/markers', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    time: z.number().min(0),
    type: z.string().default('split'),
    label: z.string().optional(),
    color: z.string().optional(),
  });

  const data = schema.parse(req.body);
  const marker = await prisma.timelineMarker.create({
    data: {
      projectId: req.params.id,
      time: data.time,
      type: data.type,
      label: data.label,
      color: data.color,
    },
  });

  res.status(201).json(marker);
}));

router.delete('/markers/:markerId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  await prisma.timelineMarker.delete({ where: { id: req.params.markerId } });
  res.json({ deleted: true });
}));

export { router as projectRoutes };
