'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Users, FileSpreadsheet, LogOut, Menu } from 'lucide-react';
import { logout } from '@/lib/api';

export type AdminSection = 'overview' | 'users';

const sections: { id: AdminSection; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'النظرة الشاملة', icon: BarChart3 },
  { id: 'users', label: 'المستخدمون', icon: Users },
];

interface AdminNavProps {
  activeSection: AdminSection;
  onSectionChange: (s: AdminSection) => void;
}

export function AdminNav({ activeSection, onSectionChange }: AdminNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    setMobileMenuOpen(false);
    await logout();
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex md:hidden items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-brand-black/95 px-4 py-3">
        <span className="text-lg font-bold text-slate-800 dark:text-white">لوحة الأدمن</span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="فتح القائمة"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

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
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { onSectionChange(id); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 w-full text-right ${
                activeSection === id ? 'bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/20 border-r-2 border-brand-orange' : ''
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </button>
          ))}
          <Link
            href="/mediabuyer"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="h-5 w-5 shrink-0" />
            التقارير والزبائن
          </Link>
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

      <aside className="hidden md:flex md:flex-col md:fixed md:top-0 md:right-0 md:w-56 md:h-screen md:border-l md:border-slate-200 md:bg-white dark:md:border-slate-700 dark:md:bg-slate-900 md:shadow-card" dir="rtl">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <span className="text-lg font-bold text-slate-800 dark:text-white">لوحة الأدمن</span>
        </div>
        <div className="flex flex-col flex-1 py-4">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                activeSection === id ? 'bg-brand-orange/10 text-brand-orange dark:bg-brand-orange/20 font-medium' : ''
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </button>
          ))}
          <Link
            href="/mediabuyer"
            className="flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="h-5 w-5 shrink-0" />
            التقارير والزبائن
          </Link>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleLogout}
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
