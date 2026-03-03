'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, updateProfile } from '@/lib/api';
import { Toast, type ToastType } from '@/components/ui/Toast';
import { Loader2, Check, User } from 'lucide-react';

function ClientSettingsContent() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', username: '' });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const u = localStorage.getItem('khtwat_user');
    if (!u) {
      router.replace('/login');
      return;
    }
    try {
      const user = JSON.parse(u);
      if (user.role !== 'client') {
        router.replace(user.role === 'mediabuyer' || user.role === 'admin' ? '/mediabuyer' : '/login');
        return;
      }
    } catch {
      router.replace('/login');
      return;
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted) return;
    getMe()
      .then((res) => setProfileForm({ name: res.user.name, username: res.user.username ?? '' }))
      .catch(() => {});
  }, [mounted]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileForm.name.trim()) return;
    setProfileSaving(true);
    try {
      const user = await updateProfile({ name: profileForm.name.trim(), username: profileForm.username.trim() || null });
      setProfileForm({ name: user.name, username: user.username ?? '' });
      if (typeof window !== 'undefined') {
        const u = localStorage.getItem('khtwat_user');
        if (u) {
          const parsed = JSON.parse(u);
          localStorage.setItem('khtwat_user', JSON.stringify({ ...parsed, name: user.name, username: user.username ?? null }));
        }
      }
      setToast({ message: 'تم تحديث الملف الشخصي.', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'فشل التحديث.', type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">الإعدادات</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
        تحديث الملف الشخصي (الاسم واسم المستخدم).
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-brand-orange" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">الملف الشخصي</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">الاسم</label>
          <input
            type="text"
            value={profileForm.name}
            onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">اسم المستخدم (للدخول مع الإيميل)</label>
          <input
            type="text"
            value={profileForm.username}
            onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
            placeholder="اختياري"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={profileSaving}
            className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark disabled:opacity-70"
          >
            {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            حفظ الملف الشخصي
          </button>
        </form>
      </section>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

export default function ClientSettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><p className="text-slate-500">جاري التحميل...</p></div>}>
      <ClientSettingsContent />
    </Suspense>
  );
}
