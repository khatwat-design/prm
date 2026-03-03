'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getMe, updateProfile } from '@/lib/api';
import { Toast, type ToastType } from '@/components/ui/Toast';
import { Loader2, Check } from 'lucide-react';

function ClientSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [clientProfile, setClientProfile] = useState<{ meta_connected: boolean; fb_ad_account_id: string | null } | null>(null);
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
      .then((res) => {
        if (res.client) setClientProfile({ meta_connected: res.client.meta_connected, fb_ad_account_id: res.client.fb_ad_account_id ?? null });
        setProfileForm({ name: res.user.name, username: res.user.username ?? '' });
      })
      .catch(() => setClientProfile(null));
  }, [mounted]);

  useEffect(() => {
    const meta = searchParams.get('meta');
    if (meta === 'connected') {
      setToast({ message: 'تم ربط حساب ميتا بنجاح.', type: 'success' });
      window.history.replaceState({}, '', '/dashboard/client/settings');
      getMe().then((res) => {
        if (res.client) setClientProfile({ meta_connected: res.client.meta_connected, fb_ad_account_id: res.client.fb_ad_account_id ?? null });
      }).catch(() => {});
    } else if (meta === 'error' || meta === 'token_exchange_failed' || meta === 'invalid_state' || meta === 'no_client') {
      const msg = searchParams.get('message') || (meta === 'token_exchange_failed' ? 'فشل استبدال التوكن.' : 'حدث خطأ أثناء الربط.');
      setToast({ message: msg, type: 'error' });
      window.history.replaceState({}, '', '/dashboard/client/settings');
    }
  }, [searchParams]);

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
      <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">الإعدادات</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        الملف الشخصي وربط حساب ميتا لسحب الصرف وعدد الرسائل تلقائياً.
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800/50 mb-6">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-3">الملف الشخصي</h2>
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

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-2">ربط ميتا</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ربط حساب ميتا يتم من قبل الميديا باير لكل عميل. إذا لم يكن حسابك مرتبطاً أو تريد تغيير الحساب الإعلاني، تواصل مع الميديا باير.
        </p>
        {clientProfile?.meta_connected && (
          <p className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <Check className="h-4 w-4" />
            حساب ميتا مرتبط — يتم سحب الصرف والرسائل تلقائياً عند استخدام لوحة التحليلات.
          </p>
        )}
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
