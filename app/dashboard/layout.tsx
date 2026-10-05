'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Settings, MessageSquare, FileText, Menu, X, ShieldAlert, Users, BarChart, History, Award, MessageCircle } from 'lucide-react';
import { logout } from '../actions/auth';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { Moon, Sun } from 'lucide-react';

function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

  // Do not show sidebar on login page (though login is no longer under this layout, kept for safety)
  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Berita & Artikel', href: '/dashboard/berita', icon: FileText },
    { name: 'Manajemen DIP', href: '/dashboard/informasi', icon: FileText },
    { name: 'Permohonan Masuk', href: '/dashboard/permohonan', icon: MessageSquare },
    { name: 'Keberatan', href: '/dashboard/keberatan', icon: ShieldAlert },
    { name: 'Partisipasi Publik', href: '/dashboard/partisipasi', icon: MessageCircle },
    { name: 'Survei Kepuasan (SKM)', href: '/dashboard/survei', icon: Award },
    { name: 'Kotak Pesan', href: '/dashboard/pesan', icon: MessageSquare },
    { name: 'Pengguna', href: '/dashboard/pengguna', icon: Users },
    { name: 'Laporan', href: '/dashboard/laporan', icon: BarChart },
    { name: 'Log Aktivitas', href: '/dashboard/log', icon: History },
    { name: 'Konten Statis', href: '/dashboard/konten-statis', icon: FileText },
    { name: 'Notifikasi & Email', href: '/dashboard/notifikasi', icon: Settings },
    { name: 'Pengaturan Umum', href: '/dashboard/pengaturan', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-50">
        <div className="font-bold text-lg text-emerald-700 dark:text-emerald-500">PPID Admin</div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600 dark:text-slate-400">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 bg-slate-950 font-bold text-xl text-white tracking-tight gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logo-kemenag.png" alt="Logo Kemenag" className="w-full h-full object-contain" />
            </div>
            Admin Panel
          </div>

          <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive 
                      ? 'bg-emerald-600 text-white font-medium' 
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-sm text-slate-400">Tema</span>
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

// Layout Wrapper to properly isolate Sidebar logic and avoid ThemeProvider nesting issues if already wrapped in RootLayout
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 ${!isLoginPage ? 'md:pl-64 pt-16 md:pt-0' : ''}`}>
      <AdminSidebar />
      <main className="p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
