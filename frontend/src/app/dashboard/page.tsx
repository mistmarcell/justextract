'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Film, Music, Scissors, Upload, Clock,
  Cloud, TrendingUp, HardDrive, Activity,
  ArrowRight, Plus,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { mediaApi, jobApi, projectApi } from '@/lib/api';
import { formatDuration, formatFileSize, formatDate } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, change, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 group hover:border-primary-500/30 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-500`} />
        </div>
        {change && (
          <span className="text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-surface-500 mt-0.5">{label}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: media, isLoading: mediaLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => mediaApi.list().then(r => r.data),
  });

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs-history'],
    queryFn: () => jobApi.history(1).then(r => r.data),
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.list().then(r => r.data),
  });

  const mediaItems = media || [];
  const recentJobs = jobsData?.jobs || [];
  const projectItems = projects || [];

  const totalDuration = mediaItems.reduce((sum: number, m: any) => sum + (m.duration || 0), 0);
  const totalSize = mediaItems.reduce((sum: number, m: any) => sum + (Number(m.size) || 0), 0);
  const completedJobs = recentJobs.filter((j: any) => j.status === 'COMPLETED').length;
  const processingJobs = recentJobs.filter((j: any) => j.status === 'PROCESSING').length;

  const quickActions = [
    { icon: Upload, label: 'Upload Video', href: '/editor', color: 'primary' },
    { icon: Cloud, label: 'Import URL', href: '/editor?tab=url', color: 'primary' },
    { icon: Music, label: 'Extract Audio', href: '/editor', color: 'primary' },
    { icon: Scissors, label: 'Split Video', href: '/editor', color: 'primary' },
  ];

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-surface-500 mt-1">Welcome back to <span className="font-medium text-surface-700 dark:text-surface-300">Just-E</span></p>
          </div>
          <Link href="/editor" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Film} label="Media Files" value={mediaItems.length} color="primary" />
          <StatCard icon={Activity} label="Completed Jobs" value={completedJobs} color="emerald" />
          <StatCard icon={Clock} label="Processing" value={processingJobs} color="amber" />
          <StatCard icon={HardDrive} label="Storage Used" value={formatFileSize(totalSize)} color="blue" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <h2 className="font-semibold">Quick Actions</h2>
            </div>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <action.icon className="w-4 h-4 text-primary-500" />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <h2 className="font-semibold">Recent Projects</h2>
              <Link href="/editor" className="text-sm text-primary-500 hover:text-primary-600 font-medium">View All</Link>
            </div>
            <CardContent>
              {projectsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : projectItems.length === 0 ? (
                <div className="text-center py-6">
                  <Film className="w-12 h-12 mx-auto text-surface-300 mb-3" />
                  <p className="text-sm text-surface-500">No projects yet</p>
                  <Link href="/editor" className="text-sm text-primary-500 hover:text-primary-600 font-medium mt-1 inline-block">
                    Create your first project
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectItems.slice(0, 5).map((project: any) => (
                    <Link
                      key={project.id}
                      href={`/editor?project=${project.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Film className="w-4 h-4 text-surface-400" />
                        <div>
                          <p className="text-sm font-medium">{project.title}</p>
                          <p className="text-xs text-surface-500">{formatDate(project.updatedAt)}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-surface-400" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
            <h2 className="font-semibold">Recent Jobs</h2>
            <Link href="/history" className="text-sm text-primary-500 hover:text-primary-600 font-medium">View All</Link>
          </div>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto text-surface-300 mb-3" />
                <p className="text-sm text-surface-500">No jobs processed yet</p>
                <Link href="/editor" className="text-sm text-primary-500 hover:text-primary-600 font-medium mt-1 inline-block">
                  Start processing media
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-surface-500 border-b border-surface-200 dark:border-surface-800">
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Progress</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentJobs.slice(0, 8).map((job: any) => (
                      <tr key={job.id} className="border-b border-surface-100 dark:border-surface-800/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {job.type === 'AUDIO_EXTRACT' ? <Music className="w-4 h-4 text-surface-400" /> :
                             job.type === 'VIDEO_SPLIT' ? <Scissors className="w-4 h-4 text-surface-400" /> :
                             <Film className="w-4 h-4 text-surface-400" />}
                            <span className="capitalize">{job.type.replace(/_/g, ' ').toLowerCase()}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`badge ${
                            job.status === 'COMPLETED' ? 'badge-success' :
                            job.status === 'PROCESSING' ? 'badge-warning' :
                            job.status === 'FAILED' ? 'badge-error' :
                            'badge-info'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-surface-500">{Math.round(job.progress)}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-surface-500 text-xs">{formatDate(job.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
