'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Film, History, Settings, Users,
  Upload, Music, Scissors, LogOut, ChevronLeft,
  ChevronRight, Clock, Server, Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'New Project', href: '/editor', icon: Film },
  { label: 'Job History', href: '/history', icon: Clock },
  { label: 'Admin Panel', href: '/admin', icon: Server, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [collapsed, setCollapsed] = useState(false);
  const user = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('user') || 'null')
    : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    router.push('/');
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-40 flex flex-col border-r border-surface-200 dark:border-surface-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn(
        'h-full flex flex-col glass-strong',
        collapsed ? 'items-center px-2' : 'px-4'
      )}>
        <div className={cn(
          'flex items-center h-16 border-b border-surface-200 dark:border-surface-800',
          collapsed ? 'justify-center' : 'gap-3'
        )}>
          {!collapsed && (
            <>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm truncate">Just Extract</span>
            </>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'btn-ghost p-1.5',
              collapsed ? 'mt-2' : 'ml-auto'
            )}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className={cn('flex-1 py-4 space-y-1', collapsed && 'flex flex-col items-center')}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            if (item.adminOnly && user?.role !== 'ADMIN') return null;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-200',
                  collapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-500')} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn(
          'py-4 border-t border-surface-200 dark:border-surface-800',
          collapsed ? 'flex flex-col items-center' : 'space-y-3'
        )}>
          {!collapsed && user && (
            <div className="px-3 py-2 rounded-lg bg-surface-50 dark:bg-surface-800/50">
              <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
              <p className="text-xs text-surface-500 truncate">{user.email || 'Guest'}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
