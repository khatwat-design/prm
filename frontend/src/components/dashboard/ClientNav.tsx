'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LayoutDashboard, Settings, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { logout } from '@/lib/api';

const navItems = [
  { href: '/dashboard/client', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/dashboard/client/settings', label: 'إعدادات الربط', icon: Settings },
] as const;

export function ClientNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  async function handleLogout() {
    setMobileMenuOpen(false);
    await logout();
  }

  const isActive = (href: string) => {
    if (href === '/dashboard/client') return pathname === '/dashboard/client';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* شريط علوي للهواتف فقط */}
      <header className="sticky top-0 z-50 flex md:hidden items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-brand-black/95 px-4 py-3">
        <span className="text-lg font-bold text-slate-800 dark:text-white">خطوات</span>
        <div className="flex items-center gap-2">
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-lg p-2 text-slate-600 dark:text-slate-300"
              aria-label="تبديل الثيم"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="فتح القائمة"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* قائمة منسدلة للهواتف */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}
      <nav
        className={`fixed top-[52px] right-0 z-40 w-72 max-w-[85vw] border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-xl md:hidden transition-transform duration-200 ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        dir="rtl"
      >
        <div className="flex flex-col py-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                isActive(href) ? 'bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/20 border-r-2 border-brand-orange' : ''
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 text-right w-full"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            خروج
          </button>
        </div>
      </nav>

      {/* قائمة جانبية للشاشات المتوسطة وما فوق */}
      <aside className="hidden md:flex md:flex-col md:fixed md:top-0 md:right-0 md:w-56 md:h-screen md:border-l md:border-slate-200 md:bg-white dark:md:border-slate-700 dark:md:bg-slate-900 md:shadow-card" dir="rtl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <span className="text-lg font-bold text-slate-800 dark:text-white">خطوات</span>
        </div>
        <div className="flex flex-col flex-1 py-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                isActive(href) ? 'bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/20 font-medium' : ''
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          ))}
          <div className="flex-1" />
          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {theme === 'dark' ? 'وضع فاتح' : 'وضع داكن'}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleLogout()}
            className="flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            خروج
          </button>
        </div>
      </aside>
    </>
  );
}
