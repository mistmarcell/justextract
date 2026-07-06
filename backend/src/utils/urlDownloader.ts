import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { config } from '../config';

interface UrlMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  formats: Array<{
    quality: string;
    format: string;
    size: number;
  }>;
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname.includes('youtube') || hostname.includes('youtu.be')) {
    return fetchYouTubeMetadata(url);
  } else if (hostname.includes('tiktok') || hostname.includes('vm.tiktok')) {
    return fetchYouTubeMetadata(url);
  } else if (hostname.includes('vimeo')) {
    return fetchVimeoMetadata(url);
  } else if (hostname.includes('drive.google.com')) {
    return fetchGoogleDriveMetadata(url);
  } else if (hostname.includes('dropbox.com')) {
    return fetchDropboxMetadata(url);
  } else {
    return fetchDirectMetadata(url);
  }
}

async function fetchYouTubeMetadata(url: string): Promise<UrlMetadata> {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-download',
      url,
    ];

    const proc = spawn(config.youtube.dlPath, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp failed: ${stderr}`));
        return;
      }

      try {
        const info = JSON.parse(stdout.split('\n')[0]);
        resolve({
          title: info.title || 'Unknown',
          duration: info.duration || 0,
          thumbnail: info.thumbnail || '',
          formats: (info.formats || [])
            .filter((f: any) => f.height)
            .map((f: any) => ({
              quality: `${f.height}p${f.fps ? ` ${f.fps}fps` : ''}`,
              format: f.ext,
              size: f.filesize || f.filesize_approx || 0,
            }))
            .slice(0, 10),
        });
      } catch {
        reject(new Error('Failed to parse YouTube metadata'));
      }
    });

    proc.on('error', reject);
  });
}

async function fetchVimeoMetadata(url: string): Promise<UrlMetadata> {
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-json',
      '--no-download',
      url,
    ];

    const proc = spawn(config.youtube.dlPath, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to fetch Vimeo metadata: ${stderr}`));
        return;
      }

      try {
        const info = JSON.parse(stdout);
        resolve({
          title: info.title || 'Unknown',
          duration: info.duration || 0,
          thumbnail: info.thumbnail || '',
          formats: (info.formats || []).map((f: any) => ({
            quality: `${f.height || 'unknown'}p`,
            format: f.ext || 'mp4',
            size: f.filesize || 0,
          })),
        });
      } catch {
        reject(new Error('Failed to parse Vimeo metadata'));
      }
    });

    proc.on('error', reject);
  });
}

async function fetchGoogleDriveMetadata(url: string): Promise<UrlMetadata> {
  return {
    title: 'Google Drive File',
    duration: 0,
    thumbnail: '',
    formats: [{ quality: 'Original', format: 'mp4', size: 0 }],
  };
}

async function fetchDropboxMetadata(url: string): Promise<UrlMetadata> {
  return {
    title: 'Dropbox File',
    duration: 0,
    thumbnail: '',
    formats: [{ quality: 'Original', format: 'mp4', size: 0 }],
  };
}

async function fetchDirectMetadata(url: string): Promise<UrlMetadata> {
  const filename = path.basename(new URL(url).pathname) || 'video.mp4';
  return {
    title: filename,
    duration: 0,
    thumbnail: '',
    formats: [{ quality: 'Original', format: path.extname(filename).replace('.', ''), size: 0 }],
  };
}

export async function downloadFromUrl(
  url: string,
  jobId: string,
  onProgress: (progress: number) => void
): Promise<string> {
  const outputDir = path.resolve(config.storage.outputDir, jobId);
  await fs.mkdir(outputDir, { recursive: true });

  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.toLowerCase();

  if (hostname.includes('youtube') || hostname.includes('youtu.be') || hostname.includes('tiktok') || hostname.includes('vm.tiktok') || hostname.includes('vimeo')) {
    return downloadWithYtDlp(url, outputDir, jobId, onProgress);
  } else {
    return downloadDirect(url, outputDir, jobId, onProgress);
  }
}

async function downloadWithYtDlp(
  url: string,
  outputDir: string,
  _jobId: string,
  onProgress: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputTemplate = path.join(outputDir, '%(title)s.%(ext)s');
    const args = [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '-o', outputTemplate,
      '--no-playlist',
      '--progress',
      '--newline',
      url,
    ];

    const proc = spawn(config.youtube.dlPath, args);
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      const progressMatch = output.match(/(\d+\.?\d*)%/);
      if (progressMatch) {
        onProgress(parseFloat(progressMatch[1]));
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error(`Download failed: ${stderr}`));
        return;
      }

      const files = await fs.readdir(outputDir);
      const videoFile = files.find(f => f !== '.');

      if (videoFile) {
        resolve(path.join(outputDir, videoFile));
      } else {
        reject(new Error('No file downloaded'));
      }
    });

    proc.on('error', reject);
  });
}

async function downloadDirect(
  url: string,
  outputDir: string,
  _jobId: string,
  onProgress: (progress: number) => void
): Promise<string> {
  const parsedUrl = new URL(url);
  const filename = path.basename(parsedUrl.pathname) || 'download.mp4';
  const outputPath = path.join(outputDir, filename);

  return new Promise((resolve, reject) => {
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    const fileStream = require('fs').createWriteStream(outputPath);
    let downloadedBytes = 0;
    let totalBytes = 0;

    protocol.get(url, (response: any) => {
      totalBytes = parseInt(response.headers['content-length'] || '0', 10);

      response.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        if (totalBytes > 0) {
          onProgress(Math.round((downloadedBytes / totalBytes) * 100));
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        onProgress(100);
        resolve(outputPath);
      });
    }).on('error', (err: Error) => {
      fileStream.close();
      fs.unlink(outputPath).catch(() => {});
      reject(err);
    });
  });
}
