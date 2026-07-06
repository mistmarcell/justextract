import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export function setupSocketHandlers(io: Server, prisma: PrismaClient) {
  const userSockets = new Map<string, Set<string>>();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (token) {
      try {
        const decoded = jwt.verify(token as string, config.jwt.secret) as { userId: string };
        (socket as any).userId = decoded.userId;
      } catch {
        // Allow connection without auth
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`Socket connected: ${socket.id}${userId ? ` (user: ${userId})` : ''}`);

    if (userId) {
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);
      socket.join(`user:${userId}`);
    }

    socket.on('subscribe:job', (jobId: string) => {
      socket.join(`job:${jobId}`);
    });

    socket.on('unsubscribe:job', (jobId: string) => {
      socket.leave(`job:${jobId}`);
    });

    socket.on('subscribe:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('unsubscribe:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('project:update', (data: { projectId: string; state: any }) => {
      socket.to(`project:${data.projectId}`).emit('project:state', data.state);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (userId && userSockets.has(userId)) {
        userSockets.get(userId)!.delete(socket.id);
        if (userSockets.get(userId)!.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  const sendJobProgress = (jobId: string, data: { progress: number; status?: string }) => {
    io.to(`job:${jobId}`).emit('job:progress', { jobId, ...data });
  };

  const sendJobComplete = (jobId: string, data: any) => {
    io.to(`job:${jobId}`).emit('job:complete', { jobId, ...data });
  };

  const sendJobError = (jobId: string, error: string) => {
    io.to(`job:${jobId}`).emit('job:error', { jobId, error });
  };

  const sendNotification = (userId: string, notification: any) => {
    io.to(`user:${userId}`).emit('notification', notification);
  };

  return {
    sendJobProgress,
    sendJobComplete,
    sendJobError,
    sendNotification,
  };
}
