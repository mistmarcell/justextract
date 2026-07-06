import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/mediaextract',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  storage: {
    uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
    outputDir: process.env.OUTPUT_DIR || path.resolve(__dirname, '../../outputs'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '2147483648', 10),
    s3: {
      endpoint: process.env.S3_ENDPOINT || '',
      region: process.env.S3_REGION || '',
      accessKey: process.env.S3_ACCESS_KEY || '',
      secretKey: process.env.S3_SECRET_KEY || '',
      bucket: process.env.S3_BUCKET || '',
    },
  },
  ffmpeg: {
    path: process.env.FFMPEG_PATH || 'ffmpeg',
    probePath: process.env.FFPROBE_PATH || 'ffprobe',
  },
  youtube: {
    dlPath: process.env.YOUTUBE_DL_PATH || 'yt-dlp',
  },
  auth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    githubClientId: process.env.GITHUB_CLIENT_ID || '',
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  supportedFormats: [
    'mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v', 'mpeg', 'ts', '3gp',
  ],
  audioFormats: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'opus'],
  videoFormats: ['mp4', 'mov', 'webm', 'mkv'],
};

export default config;
