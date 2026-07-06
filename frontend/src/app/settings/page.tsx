'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Moon, Sun, Monitor, Bell, Shield,
  HardDrive, Globe, Palette, User,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useThemeStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-surface-500 text-sm mt-1">Manage your preferences</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold">Appearance</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="label">Theme</label>
              <div className="flex gap-2">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
                      theme === t.value
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                        : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
                    )}
                  >
                    <t.icon className="w-4 h-4" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold">Preferences</h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-surface-500">Get notified when jobs complete</p>
              </div>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="rounded border-surface-300 text-primary-500 focus:ring-primary-500 w-5 h-5"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">Auto-save Projects</p>
                <p className="text-xs text-surface-500">Automatically save project state</p>
              </div>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="rounded border-surface-300 text-primary-500 focus:ring-primary-500 w-5 h-5"
              />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold">Storage</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Storage Used</span>
                <span className="font-medium">0 GB / 10 GB</span>
              </div>
              <div className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: '0%' }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
