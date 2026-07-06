import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToJob(jobId: string) {
  const s = getSocket();
  s.emit('subscribe:job', jobId);
  return () => {
    s.emit('unsubscribe:job', jobId);
  };
}

export function subscribeToProject(projectId: string) {
  const s = getSocket();
  s.emit('subscribe:project', projectId);
  return () => {
    s.emit('unsubscribe:project', projectId);
  };
}
