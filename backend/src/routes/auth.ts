import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';
import { AppError, asyncHandler } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError(409, 'Email already registered', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name || data.email.split('@')[0],
    },
  });

  const token = generateToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}));

router.post('/guest', asyncHandler(async (_req: Request, res: Response) => {
  const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const user = await prisma.user.create({
    data: {
      name: `Guest_${guestId.slice(-6)}`,
      role: 'USER',
    },
  });

  const token = generateToken(user.id);
  res.json({
    token,
    user: { id: user.id, email: null, name: user.name, role: user.role },
  });
}));

router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, email: true, name: true, avatarUrl: true,
      role: true, storageUsed: true, storageLimit: true,
      createdAt: true,
    },
  });

  if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
  res.json(user);
}));

router.put('/profile', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    name: z.string().min(2).max(50).optional(),
    avatarUrl: z.string().url().optional(),
  });

  const data = schema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: { id: true, email: true, name: true, avatarUrl: true, role: true },
  });

  res.json(user);
}));

export { router as authRoutes };
