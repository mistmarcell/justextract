'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Film, Music, Scissors, Cloud, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  const features = [
    { icon: Film, title: 'Video Import', description: 'Upload, drag & drop, or paste URLs from YouTube, Vimeo, and more' },
    { icon: Music, title: 'Audio Extraction', description: 'Extract audio in MP3, WAV, FLAC, AAC, and more formats' },
    { icon: Scissors, title: 'Smart Splitting', description: 'Split videos by markers, scenes, silence, or equal parts' },
    { icon: Cloud, title: 'Cloud Integration', description: 'Import from Google Drive, Dropbox, and cloud storage' },
    { icon: Shield, title: 'Secure Processing', description: 'Enterprise-grade security with encrypted transfers' },
    { icon: Zap, title: 'Fast Encoding', description: 'Hardware-accelerated encoding with multi-threading support' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-primary-950 to-surface-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_50%)]" />

      <header className="relative z-10 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Just Extract</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth" className="text-sm text-surface-300 hover:text-white transition-colors px-4 py-2">
                Sign In
              </Link>
              <Link
                href="/auth?register=true"
                className="btn-primary text-sm"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-6">
                <Zap className="w-3 h-3" />
                Professional Video & Audio Processing
              </div>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                Extract, Split, and
                <span className="text-gradient block mt-2">Export Media</span>
                <span className="block text-sm text-surface-500 font-normal mt-2">Just-E</span>
              </h1>
              <p className="text-lg sm:text-xl text-surface-400 max-w-2xl mx-auto mb-8">
                Professional-grade video and audio processing tool. Extract audio, split videos,
                and export clips with precision — all in your browser.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link
                  href="/auth?register=true"
                  className="btn-primary text-base px-8 py-3"
                >
                  Start Free
                </Link>
                <Link
                  href="/auth"
                  className="btn-secondary text-base px-8 py-3 bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-surface-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
