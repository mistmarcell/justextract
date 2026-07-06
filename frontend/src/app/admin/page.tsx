'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Server, Activity, HardDrive, Clock,
  AlertTriangle, RefreshCw, Cpu, MemoryStick,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminApi } from '@/lib/api';
import { formatFileSize } from '@/lib/utils';

export default function AdminPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.dashboard().then(r => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  const stats = data?.stats || {};
  const system = data?.system || {};

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-surface-500 text-sm mt-1">System overview and management</p>
          </div>
          <button onClick={() => refetch()} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers || 0} color="primary" />
          <StatCard icon={Activity} label="Total Jobs" value={stats.totalJobs || 0} color="emerald" />
          <StatCard icon={Server} label="Processing" value={stats.processingJobs || 0} color="amber" />
          <StatCard icon={HardDrive} label="Storage" value={formatFileSize(stats.storageUsed || 0)} color="blue" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold">System Status</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Platform</span>
                <span className="text-sm font-medium capitalize">{system.platform}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Node Version</span>
                <span className="text-sm font-medium">{system.nodeVersion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">CPU Cores</span>
                <span className="text-sm font-medium">{system.cpu?.cores || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">CPU Model</span>
                <span className="text-sm font-medium truncate max-w-[200px]">{system.cpu?.model || 'Unknown'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Memory Usage</span>
                <span className="text-sm font-medium">{system.memory?.usage || 0}%</span>
              </div>
              <div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${system.memory?.usage || 0}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Uptime</span>
                <span className="text-sm font-medium">
                  {Math.floor((system.uptime || 0) / 3600)}h {Math.floor(((system.uptime || 0) % 3600) / 60)}m
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold">Job Statistics</h3>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500">Total Jobs</span>
                <span className="text-sm font-medium">{stats.totalJobs || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500 text-emerald-600">Completed</span>
                <span className="text-sm font-medium text-emerald-600">{stats.completedJobs || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500 text-amber-600">Processing</span>
                <span className="text-sm font-medium text-amber-600">{stats.processingJobs || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-500 text-red-600">Failed</span>
                <span className="text-sm font-medium text-red-600">{stats.failedJobs || 0}</span>
              </div>
              <div className="pt-2">
                <div className="flex gap-2">
                  <div className="flex-1 h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden flex">
                    {stats.totalJobs > 0 && (
                      <>
                        <div className="h-full bg-emerald-500" style={{ width: `${((stats.completedJobs || 0) / stats.totalJobs) * 100}%` }} />
                        <div className="h-full bg-amber-500" style={{ width: `${((stats.processingJobs || 0) / stats.totalJobs) * 100}%` }} />
                        <div className="h-full bg-red-500" style={{ width: `${((stats.failedJobs || 0) / stats.totalJobs) * 100}%` }} />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-surface-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Complete</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Processing</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-500`} />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-surface-500 mt-0.5">{label}</p>
    </motion.div>
  );
}
