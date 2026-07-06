# Just Extract (Just-E)

Professional video and audio processing web application. Extract audio, split videos, and export clips with precision — all in your browser.

![CI](https://github.com/YOUR_USERNAME/justextract/actions/workflows/ci.yml/badge.svg)

## Features

### Video Import
- Upload from device (drag & drop)
- Paste URLs (YouTube, Vimeo, direct MP4/WebM, Google Drive, Dropbox)
- Upload progress indicators
- URL metadata fetching
- Supported formats: MP4, MOV, AVI, MKV, WEBM, FLV, M4V, MPEG, TS, 3GP

### Video Player
- Play/Pause, volume, playback speed, fullscreen
- Frame stepping, keyboard shortcuts
- Seek bar with thumbnail preview
- Timestamp display, buffer indicator

### Interactive Timeline
- Zoom and scroll
- Drag playhead with timestamp tooltip
- Add split markers and clips
- Snap to frames
- Color-coded clips
- Waveform visualization

### Audio Extraction
- Extract full audio or selected timeline section
- Formats: MP3, WAV, AAC, FLAC, OGG, M4A, OPUS
- Quality: 64kbps - 320kbps + Lossless
- Sample rates: 44.1kHz, 48kHz, 96kHz
- Mono/Stereo selection
- Volume normalization
- Fade in/out

### Video Export
- Split by markers, scenes, silence, or equal duration
- Formats: MP4, MOV, WEBM, MKV
- Codecs: H.264, H.265, AV1, VP9
- Resolutions: Original to 480p
- FPS: Original, 24, 30, 60

### Job Management
- Background processing with progress updates
- Job history with status tracking
- Cancel and retry failed jobs
- Real-time updates via WebSocket

### Authentication
- Guest mode
- Email/password registration
- Google OAuth and GitHub OAuth support
- JWT-based sessions

### Admin Dashboard
- System monitoring (CPU, memory, uptime)
- User and job management
- Server health metrics

## Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19** with TypeScript
- **Tailwind CSS** with dark mode
- **Framer Motion** animations
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Socket.IO client** for real-time updates
- **React Dropzone** for file uploads

### Backend
- **Express** with TypeScript
- **Prisma ORM** with PostgreSQL
- **BullMQ** with Redis for job queues
- **Socket.IO** for real-time communication
- **FFmpeg/FFprobe** for media processing
- **yt-dlp** for URL downloads
- **JWT** authentication

### Deployment
- Docker Compose for local development
- Vercel (frontend) + Railway/Render (backend)
- Cloudflare R2 for object storage

## Getting Started

### Prerequisites

- Node.js 20+
- Redis 7 (or Docker)
- FFmpeg installed on system path
- MongoDB Atlas free cluster (or local MongoDB)
- yt-dlp (optional, for URL downloads)

### Quick Start

1. Clone and install:
   ```bash
   git clone <repo-url>
   cd justextract
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

2. Create a free MongoDB Atlas cluster at https://mongodb.com/atlas, then:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env — set your DATABASE_URL to your Atlas connection string
   ```

3. Start Redis (via Docker):
   ```bash
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

4. Push schema and seed data:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start development:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

### Docker Deployment (full stack)

```bash
docker-compose up -d
```

## Project Structure

```
mediaextract-pro/
├── frontend/                # Next.js 15 application
│   └── src/
│       ├── app/            # Pages (App Router)
│       │   ├── auth/       # Authentication pages
│       │   ├── dashboard/  # Main dashboard
│       │   ├── editor/     # Video editor
│       │   ├── history/    # Job history
│       │   ├── admin/      # Admin panel
│       │   └── settings/   # User settings
│       ├── components/     # React components
│       │   ├── ui/         # UI primitives
│       │   ├── player/     # Video player
│       │   ├── timeline/   # Timeline editor
│       │   ├── upload/     # Upload components
│       │   ├── export/     # Export panels
│       │   └── layout/     # Layout components
│       ├── lib/            # Utilities, API client, stores
│       └── types/          # TypeScript definitions
├── backend/                # Express API server
│   └── src/
│       ├── routes/         # API route handlers
│       ├── services/       # Business logic (FFmpeg, etc.)
│       ├── middleware/     # Auth, error handling
│       ├── utils/          # URL downloader helpers
│       └── config/         # App configuration
├── docker/                 # Dockerfiles
└── docker-compose.yml      # Docker Compose configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/guest` - Guest session
- `GET /api/auth/me` - Current user profile
- `PUT /api/auth/profile` - Update profile

### Media
- `GET /api/media` - List media files
- `GET /api/media/:id` - Get media details
- `POST /api/media/:id/metadata` - Extract FFprobe metadata
- `POST /api/media/:id/waveform` - Generate waveform
- `DELETE /api/media/:id` - Delete media

### Upload
- `POST /api/upload` - Upload files
- `POST /api/upload/chunk` - Chunked upload

### Jobs
- `POST /api/jobs/extract-audio` - Extract audio
- `POST /api/jobs/split-video` - Split/export video
- `GET /api/jobs/history` - Job history
- `GET /api/jobs/:id` - Job details
- `POST /api/jobs/:id/cancel` - Cancel job
- `POST /api/jobs/:id/retry` - Retry failed job
- `GET /api/jobs/:id/download` - Download output

### URL Import
- `POST /api/url-import/metadata` - Fetch URL metadata
- `POST /api/url-import/download` - Download from URL

### Admin
- `GET /api/admin/dashboard` - System dashboard
- `GET /api/admin/users` - List users
- `GET /api/admin/jobs` - List all jobs
- `GET /api/admin/logs` - System logs
- `GET /api/admin/settings` - System settings
- `PUT /api/admin/settings` - Update setting

## Environment Variables

See `backend/.env.example` for all available configuration options.

## License

MIT
