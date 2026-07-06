import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export interface FFprobeMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  audioCodec: string;
  audioChannels: number;
  sampleRate: number;
  size: number;
}

export interface ExtractAudioOptions {
  startTime?: number;
  duration?: number;
  format: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  normalize?: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

export interface SplitVideoOptions {
  markers: Array<{ start: number; end: number; name?: string }>;
  format: string;
  quality?: 'original' | 'compress';
  codec?: 'h264' | 'h265' | 'av1' | 'vp9';
  resolution?: 'original' | '2160' | '1440' | '1080' | '720' | '480';
  fps?: 'original' | '24' | '30' | '60';
}

export class FFmpegService extends EventEmitter {
  private runningProcesses: Map<string, any> = new Map();

  async getMetadata(filePath: string): Promise<FFprobeMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ];

      const proc = spawn(config.ffmpeg.probePath, args);
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
          reject(new Error(`FFprobe failed: ${stderr}`));
          return;
        }

        try {
          const info = JSON.parse(stdout);
          const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
          const audioStream = info.streams.find((s: any) => s.codec_type === 'audio');

          const metadata: FFprobeMetadata = {
            duration: parseFloat(info.format?.duration || '0'),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps: evalFPS(videoStream?.r_frame_rate || '0/1'),
            codec: videoStream?.codec_name || 'unknown',
            bitrate: parseInt(info.format?.bit_rate || '0'),
            audioCodec: audioStream?.codec_name || 'none',
            audioChannels: audioStream?.channels || 0,
            sampleRate: parseInt(audioStream?.sample_rate || '0'),
            size: parseInt(info.format?.size || '0'),
          };

          resolve(metadata);
        } catch (e) {
          reject(new Error('Failed to parse FFprobe output'));
        }
      });

      proc.on('error', reject);
    });
  }

  async extractAudio(
    inputPath: string,
    options: ExtractAudioOptions,
    jobId: string
  ): Promise<string> {
    const outputDir = path.resolve(config.storage.outputDir, jobId);
    await fs.mkdir(outputDir, { recursive: true });

    const outputExt = options.format === 'm4a' ? 'm4a' : options.format;
    const outputPath = path.join(outputDir, `audio.${outputExt}`);

    return new Promise((resolve, reject) => {
      const args = ['-i', inputPath];

      if (options.startTime !== undefined) {
        args.push('-ss', String(options.startTime));
      }

      if (options.duration !== undefined) {
        args.push('-t', String(options.duration));
      }

      const codecMap: Record<string, string> = {
        mp3: 'libmp3lame',
        wav: 'pcm_s16le',
        aac: 'aac',
        flac: 'flac',
        ogg: 'libvorbis',
        m4a: 'aac',
        opus: 'libopus',
      };

      args.push('-c:a', codecMap[options.format] || 'libmp3lame');

      if (options.bitrate && options.format !== 'wav' && options.format !== 'flac') {
        args.push('-b:a', `${options.bitrate}k`);
      }

      if (options.sampleRate) {
        args.push('-ar', String(options.sampleRate));
      }

      if (options.channels) {
        args.push('-ac', String(options.channels));
      }

      if (options.normalize) {
        args.push('-af', 'loudnorm=I=-16:LRA=11:TP=-1.5');
      }

      if (options.fadeIn || options.fadeOut) {
        const afFilters: string[] = [];
        if (options.fadeIn) {
          afFilters.push(`afade=t=in:st=0:d=${options.fadeIn}`);
        }
        if (options.fadeOut && options.duration) {
          afFilters.push(`afade=t=out:st=${options.duration - options.fadeOut}:d=${options.fadeOut}`);
        }
        args.push('-af', afFilters.join(','));
      }

      args.push('-y', outputPath);

      const proc = spawn(config.ffmpeg.path, args);
      this.runningProcesses.set(jobId, proc);

      let stderr = '';
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
        const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+)\.(\d+)/g);
        if (timeMatch && options.duration) {
          const last = timeMatch[timeMatch.length - 1];
          const [h, m, s, ms] = last.replace('time=', '').split(/[:.]/);
          const currentTime = parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 100;
          const progress = Math.min((currentTime / options.duration) * 100, 99);
          this.emit('progress', { jobId, progress: Math.round(progress * 100) / 100 });
        }
      });

      proc.on('close', async (code) => {
        this.runningProcesses.delete(jobId);
        if (code !== 0) {
          reject(new Error(`FFmpeg failed: ${stderr}`));
          return;
        }
        this.emit('progress', { jobId, progress: 100 });
        this.emit('completed', { jobId, outputPath });
        resolve(outputPath);
      });

      proc.on('error', (err) => {
        this.runningProcesses.delete(jobId);
        reject(err);
      });
    });
  }

  async splitVideo(
    inputPath: string,
    markers: Array<{ start: number; end: number; name?: string }>,
    options: {
      format?: string;
      codec?: string;
      resolution?: string;
      fps?: string;
    },
    jobId: string
  ): Promise<string[]> {
    const outputDir = path.resolve(config.storage.outputDir, jobId);
    await fs.mkdir(outputDir, { recursive: true });

    const outputPaths: string[] = [];
    const format = options.format || 'mp4';

    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i];
      const outputName = marker.name || `clip_${(i + 1).toString().padStart(2, '0')}`;
      const outputPath = path.join(outputDir, `${outputName}.${format}`);
      outputPaths.push(outputPath);

      await this.encodeClip(inputPath, marker.start, marker.end, outputPath, options, jobId, i, markers.length);
    }

    return outputPaths;
  }

  private async encodeClip(
    inputPath: string,
    start: number,
    end: number,
    outputPath: string,
    options: { format?: string; codec?: string; resolution?: string; fps?: string },
    jobId: string,
    clipIndex: number,
    totalClips: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const duration = end - start;
      const args = [
        '-ss', String(start),
        '-i', inputPath,
        '-t', String(duration),
      ];

      const codecMap: Record<string, string> = {
        h264: 'libx264',
        h265: 'libx265',
        av1: 'libaom-av1',
        vp9: 'libvpx-vp9',
      };

      const videoCodec = options.codec ? codecMap[options.codec] : 'libx264';
      args.push('-c:v', videoCodec);

      if (options.codec === 'h264' || !options.codec) {
        args.push('-preset', 'medium', '-crf', '23');
      }

      args.push('-c:a', 'aac', '-b:a', '192k');

      if (options.resolution && options.resolution !== 'original') {
        const resMap: Record<string, string> = {
          '2160': '3840:2160',
          '1440': '2560:1440',
          '1080': '1920:1080',
          '720': '1280:720',
          '480': '854:480',
        };
        args.push('-vf', `scale=${resMap[options.resolution]}:force_original_aspect_ratio=decrease,pad=${resMap[options.resolution]}:(ow-iw)/2:(oh-ih)/2`);
      }

      if (options.fps && options.fps !== 'original') {
        args.push('-r', options.fps);
      }

      args.push('-progress', 'pipe:1', '-y', outputPath);

      const proc = spawn(config.ffmpeg.path, args);
      this.runningProcesses.set(`${jobId}_${clipIndex}`, proc);

      let stderr = '';
      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        const timeMatch = output.match(/out_time_us=(\d+)/);
        if (timeMatch && duration > 0) {
          const currentTime = parseInt(timeMatch[1]) / 1_000_000;
          const clipProgress = (currentTime / duration) * 100;
          const overallProgress = ((clipIndex + clipProgress / 100) / totalClips) * 100;
          this.emit('progress', {
            jobId,
            progress: Math.round(overallProgress * 100) / 100,
            clipIndex,
            totalClips,
          });
        }
      });

      proc.on('close', async (code) => {
        this.runningProcesses.delete(`${jobId}_${clipIndex}`);
        if (code !== 0) {
          reject(new Error(`FFmpeg clip encoding failed: ${stderr}`));
          return;
        }
        resolve();
      });

      proc.on('error', (err) => {
        this.runningProcesses.delete(`${jobId}_${clipIndex}`);
        reject(err);
      });
    });
  }

  async generateWaveform(
    inputPath: string,
    jobId: string,
    options: { width?: number; height?: number; color?: string } = {}
  ): Promise<string> {
    const outputDir = path.resolve(config.storage.outputDir, jobId);
    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, 'waveform.png');
    const width = options.width || 1920;
    const height = options.height || 200;
    const color = options.color || '#6366F1';

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-filter_complex',
        `aformat=channel_layouts=mono,compand=gain=-6,showwavespic=s=${width}x${height}:colors=${color}|${color}|${color}|${color}`,
        '-frames:v', '1',
        '-y', outputPath,
      ];

      const proc = spawn(config.ffmpeg.path, args);
      let stderr = '';

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Waveform generation failed: ${stderr}`));
          return;
        }
        resolve(outputPath);
      });

      proc.on('error', reject);
    });
  }

  async detectSilence(
    inputPath: string,
    options: { silenceDuration?: number; silenceThreshold?: number } = {}
  ): Promise<Array<{ start: number; end: number; duration: number }>> {
    const duration = options.silenceDuration || 0.5;
    const threshold = options.silenceThreshold || -40;

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-af', `silencedetect=noise=${threshold}dB:d=${duration}`,
        '-f', 'null',
        '-',
      ];

      const proc = spawn(config.ffmpeg.path, args);
      let stderr = '';

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Silence detection failed: ${stderr}`));
          return;
        }

        const silences: Array<{ start: number; end: number; duration: number }> = [];
        const lines = stderr.split('\n');
        let currentSilence: { start: number } | null = null;

        for (const line of lines) {
          const startMatch = line.match(/silence_start: ([\d.]+)/);
          const endMatch = line.match(/silence_end: ([\d.]+)/);
          const durMatch = endMatch ? line.match(/silence_duration: ([\d.]+)/) : null;

          if (startMatch) {
            currentSilence = { start: parseFloat(startMatch[1]) };
          }

          if (endMatch && currentSilence) {
            silences.push({
              start: currentSilence.start,
              end: parseFloat(endMatch[1]),
              duration: durMatch ? parseFloat(durMatch[1]) : parseFloat(endMatch[1]) - currentSilence.start,
            });
            currentSilence = null;
          }
        }

        resolve(silences);
      });

      proc.on('error', reject);
    });
  }

  async detectScenes(
    inputPath: string,
    options: { threshold?: number } = {}
  ): Promise<Array<{ timestamp: number; score: number }>> {
    const threshold = options.threshold || 0.4;

    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-filter:v', `select='gt(scene,${threshold})',showinfo`,
        '-f', 'null',
        '-',
      ];

      const proc = spawn(config.ffmpeg.path, args);
      let stderr = '';

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Scene detection failed: ${stderr}`));
          return;
        }

        const scenes: Array<{ timestamp: number; score: number }> = [];
        const lines = stderr.split('\n');

        for (const line of lines) {
          const ptsMatch = line.match(/pts_time:([\d.]+)/);
          const scoreMatch = line.match(/scene:([\d.]+)/);

          if (ptsMatch && scoreMatch) {
            scenes.push({
              timestamp: parseFloat(ptsMatch[1]),
              score: parseFloat(scoreMatch[1]),
            });
          }
        }

        resolve(scenes);
      });

      proc.on('error', reject);
    });
  }

  cancelJob(jobId: string): boolean {
    const proc = this.runningProcesses.get(jobId);
    if (proc) {
      proc.kill('SIGKILL');
      this.runningProcesses.delete(jobId);
      return true;
    }
    return false;
  }

  getRunningJobs(): string[] {
    return Array.from(this.runningProcesses.keys());
  }
}

function evalFPS(fpsStr: string): number {
  if (!fpsStr || fpsStr === '0/1') return 0;
  const parts = fpsStr.split('/');
  if (parts.length === 2) {
    return Math.round((parseInt(parts[0]) / parseInt(parts[1])) * 100) / 100;
  }
  return parseFloat(fpsStr) || 0;
}

export const ffmpegService = new FFmpegService();
