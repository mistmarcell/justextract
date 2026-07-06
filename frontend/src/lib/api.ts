import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  guest: () => api.post('/auth/guest'),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    api.put('/auth/profile', data),
};

export const uploadApi = {
  upload: (files: File[], onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
  },
};

export const mediaApi = {
  list: () => api.get('/media'),
  get: (id: string) => api.get(`/media/${id}`),
  getMetadata: (id: string) => api.post(`/media/${id}/metadata`),
  getWaveform: (id: string) => api.post(`/media/${id}/waveform`),
  delete: (id: string) => api.delete(`/media/${id}`),
};

export const jobApi = {
  extractAudio: (data: any) => api.post('/jobs/extract-audio', data),
  splitVideo: (data: any) => api.post('/jobs/split-video', data),
  history: (page = 1) => api.get(`/jobs/history?page=${page}`),
  get: (id: string) => api.get(`/jobs/${id}`),
  cancel: (id: string) => api.post(`/jobs/${id}/cancel`),
  retry: (id: string) => api.post(`/jobs/${id}/retry`),
  download: (id: string) => api.get(`/jobs/${id}/download`, { responseType: 'blob' }),
};

export const projectApi = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addClip: (projectId: string, data: any) => api.post(`/projects/${projectId}/clips`, data),
  updateClip: (clipId: string, data: any) => api.put(`/projects/clips/${clipId}`, data),
  deleteClip: (clipId: string) => api.delete(`/projects/clips/${clipId}`),
  addMarker: (projectId: string, data: any) => api.post(`/projects/${projectId}/markers`, data),
  deleteMarker: (markerId: string) => api.delete(`/projects/markers/${markerId}`),
};

export const urlImportApi = {
  getMetadata: (url: string) => api.post('/url-import/metadata', { url }),
  download: (url: string) => api.post('/url-import/download', { url }),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  users: (page = 1) => api.get(`/admin/users?page=${page}`),
  jobs: (page = 1, status?: string) => api.get(`/admin/jobs?page=${page}${status ? `&status=${status}` : ''}`),
  logs: (page = 1) => api.get(`/admin/logs?page=${page}`),
  settings: () => api.get('/admin/settings'),
  updateSetting: (key: string, value: any) => api.put('/admin/settings', { key, value }),
};

export default api;
