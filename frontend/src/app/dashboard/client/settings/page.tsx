'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getMe,
  getMetaRedirectUrl,
  getMetaAdAccounts,
  saveMetaAccount,
  syncMetaCampaigns,
  type MetaAdAccount,
} from '@/lib/api';
import { Toast, type ToastType } from '@/components/ui/Toast';
import { Link2, Loader2, Check } from 'lucide-react';

export default function ClientSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [clientProfile, setClientProfile] = useState<{ meta_connected: boolean; fb_ad_account_id: string | null } | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

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
      })
      .catch(() => setClientProfile(null));
  }, [mounted]);

  useEffect(() => {
    const meta = searchParams.get('meta');
    if (meta === 'connected') {
      setToast({ message: 'تم ربط حساب ميتا بنجاح. اختر الحساب الإعلاني أدناه.', type: 'success' });
      setClientProfile((p) => (p ? { ...p, meta_connected: true } : { meta_connected: true, fb_ad_account_id: null }));
      window.history.replaceState({}, '', '/dashboard/client/settings');
      // جلب أحدث بيانات من الخادم بعد الربط لضمان تحديث الواجهة وقائمة الحسابات الإعلانية
      getMe().then((res) => {
        if (res.client) setClientProfile({ meta_connected: res.client.meta_connected, fb_ad_account_id: res.client.fb_ad_account_id ?? null });
      }).catch(() => {});
    } else if (meta === 'error' || meta === 'token_exchange_failed' || meta === 'invalid_state' || meta === 'no_client') {
      const msg = searchParams.get('message') || (meta === 'token_exchange_failed' ? 'فشل استبدال التوكن.' : 'حدث خطأ أثناء الربط.');
      setToast({ message: msg, type: 'error' });
      window.history.replaceState({}, '', '/dashboard/client/settings');
    }
  }, [searchParams]);

  useEffect(() => {
    if (!mounted || !clientProfile?.meta_connected) return;
    setLoadingAccounts(true);
    getMetaAdAccounts()
      .then((res) => {
        setAdAccounts(res.data || []);
        if (res.data?.length && clientProfile.fb_ad_account_id) {
          const current = res.data.find((a) => (a.id || a.account_id) === clientProfile.fb_ad_account_id);
          if (current) setSelectedAdAccountId(current.id || current.account_id || '');
        }
      })
      .catch(() => setAdAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, [mounted, clientProfile?.meta_connected, clientProfile?.fb_ad_account_id]);

  function handleConnectMeta() {
    if (typeof window !== 'undefined' && !localStorage.getItem('khtwat_token')) {
      setToast({ message: 'يجب تسجيل الدخول أولاً. أعد تسجيل الدخول ثم جرّب مرة أخرى.', type: 'error' });
      return;
    }
    setLoadingMeta(true);
    getMetaRedirectUrl()
      .then((res) => {
        if (res.url) window.location.href = res.url;
        else setToast({ message: 'لم يُرجَع رابط الربط.', type: 'error' });
      })
      .catch((err: Error) => {
        let msg = err?.message || 'فشل جلب رابط الربط.';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          msg = 'تعذر الاتصال بالخادم. تأكد من تشغيل الـ Backend (php artisan serve) وعنوان NEXT_PUBLIC_API_URL.';
        } else if (msg.includes('401') || msg.includes('Unauthenticated')) {
          msg = 'انتهت الجلسة أو التوكن غير صالح. سجّل الخروج ثم ادخل مرة أخرى.';
        }
        setToast({ message: msg, type: 'error' });
      })
      .finally(() => setLoadingMeta(false));
  }

  function handleSaveAdAccount() {
    if (!selectedAdAccountId.trim()) {
      setToast({ message: 'اختر حساباً إعلانياً.', type: 'error' });
      return;
    }
    setSavingAccount(true);
    saveMetaAccount(selectedAdAccountId.trim())
      .then((res) => {
        setSavingAccount(false);
        setToast({ message: res.message || 'تم حفظ الحساب الإعلاني.', type: 'success' });
        setClientProfile((p) => (p ? { ...p, fb_ad_account_id: selectedAdAccountId.trim() } : null));
        // سحب البيانات في الخلفية (لا ننتظر حتى لا يتعلق الزر)
        syncMetaCampaigns({ days: 30 })
          .then((r) => {
            setToast({
              message: r.synced_days > 0 ? `تم سحب بيانات ${r.synced_days} يوم من ميتا.` : 'تم تحديث البيانات.',
              type: 'success',
            });
          })
          .catch(() => {
            setToast({
              message: 'تم الحفظ. لم يكتمل سحب البيانات — ستُحدَّث عند فتح لوحة التحليلات.',
              type: 'error',
            });
          });
      })
      .catch((err: Error) => {
        setToast({ message: err?.message || 'فشل حفظ الحساب الإعلاني.', type: 'error' });
      })
      .finally(() => setSavingAccount(false));
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
      <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">إعدادات الربط</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        ربط حساب ميتا لسحب الصرف وعدد الرسائل تلقائياً إلى تقاريرك.
      </p>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800/50">
        {clientProfile === null ? (
          <div className="py-2 text-sm text-slate-500 dark:text-slate-400">جاري التحميل...</div>
        ) : !clientProfile.meta_connected ? (
          <div>
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              ربط حساب ميتا يسمح بسحب الصرف الإعلاني وعدد الرسائل تلقائياً إلى تقاريرك اليومية.
            </p>
            <button
              type="button"
              onClick={handleConnectMeta}
              disabled={loadingMeta}
              className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-medium text-white hover:bg-brand-orange-dark disabled:opacity-70"
            >
              {loadingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              ربط حساب Meta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Check className="h-4 w-4" />
              حساب ميتا مرتبط.
            </p>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              الحساب الإعلاني (Ad Account)
            </label>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري جلب الحسابات...
              </div>
            ) : (
              <>
                <select
                  value={selectedAdAccountId}
                  onChange={(e) => setSelectedAdAccountId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">اختر الحساب الإعلاني</option>
                  {adAccounts.map((acc) => (
                    <option key={acc.id || acc.account_id || acc.name} value={acc.id || acc.account_id || ''}>
                      {acc.name || acc.id || acc.account_id || '—'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSaveAdAccount}
                  disabled={savingAccount || !selectedAdAccountId.trim()}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-60"
                >
                  {savingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  حفظ الاختيار
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 pt-2">
                  يتم سحب الصرف الإعلاني وعدد الرسائل من ميتا تلقائياً وباستمرار عند استخدام لوحة التحليلات.
                </p>
              </>
            )}
          </div>
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
