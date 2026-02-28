'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, createClient, getUnifiedReport, logout, type UnifiedReportResponse } from '@/lib/api';
import type { CreateClientPayload } from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import {
  UserPlus,
  LogOut,
  Loader2,
  MessageSquare,
  MousePointer,
  Megaphone,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  ChevronDown,
} from 'lucide-react';

type PlatformToggle = 'meta' | 'tiktok';
type Client = { id: number; business_name: string; user?: { name: string; email: string } };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'شغالة',
  PAUSED: 'موقوفة',
  PENDING_REVIEW: 'قيد المراجعة',
};

export default function MediaBuyerPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<PlatformToggle>('meta');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<UnifiedReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [addClientForm, setAddClientForm] = useState<CreateClientPayload>({
    name: '',
    email: '',
    password: '',
    business_name: '',
  });
  const [addClientLoading, setAddClientLoading] = useState(false);
  const [addClientError, setAddClientError] = useState('');

  function loadClients() {
    api<{ data: Client[] }>('/clients?per_page=100')
      .then((res) => setClients(res.data ?? []))
      .catch(() => setClients([]));
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const u = localStorage.getItem('khtwat_user');
    if (!u) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(u);
    if (user.role !== 'admin' && user.role !== 'mediabuyer') {
      router.push('/dashboard/client');
      return;
    }
    loadClients();
  }, [mounted, router]);

  useEffect(() => {
    if (!clientId || !from || !to) {
      setData(null);
      setError('');
      return;
    }
    setData(null);
    setLoading(true);
    setError('');
    getUnifiedReport({ client_id: clientId, from, to, platform })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'فشل تحميل التقرير'))
      .finally(() => setLoading(false));
  }, [clientId, from, to, platform]);

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    setAddClientError('');
    setAddClientLoading(true);
    try {
      await createClient(addClientForm);
      setShowAddClient(false);
      setAddClientForm({ name: '', email: '', password: '', business_name: '' });
      loadClients();
    } catch (err) {
      setAddClientError(err instanceof Error ? err.message : 'فشل إضافة الزبون');
    } finally {
      setAddClientLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-brand-black" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  const totalSpend = data?.platform === 'meta' ? (data?.total_meta_spend ?? 0) : (data?.total_spend ?? 0);
  const totalSales = data?.sales?.total_order_value ?? 0;
  const roas = data?.roas ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-brand-black p-4 md:p-8" dir="rtl">
      <div className="max-w-[1400px] mx-auto">
        <Navbar
          title="التقارير الموحدة"
          subtitle="صرف الإعلان مقابل مبيعات الزبون — ROAS"
          rightSlot={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddClient(true)}
                className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white shadow-card hover:bg-brand-orange-dark"
              >
                <UserPlus className="h-4 w-4" />
                إضافة زبون
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-card hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>
          }
        />

        {/* زر تبديل: Meta | TikTok */}
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-card dark:border-slate-700 dark:bg-slate-800/50 w-fit">
          <button
            type="button"
            onClick={() => setPlatform('meta')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
              platform === 'meta' ? 'bg-[#0668E1] text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            Meta
          </button>
          <button
            type="button"
            onClick={() => setPlatform('tiktok')}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
              platform === 'tiktok' ? 'bg-black text-white shadow' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            TikTok
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[200px] flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الزبون</label>
              <div className="relative">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-slate-800 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">-- اختر الزبون --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.business_name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">من</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">إلى</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {clientId && loading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-brand-orange" />
            <p className="text-slate-500 dark:text-slate-400">جاري تحميل التقرير...</p>
          </div>
        )}

        {data && !loading && (
          <div className="mt-6 space-y-6">
            {/* عنوان الفترة */}
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card dark:border-slate-700 dark:bg-slate-800/50">
              {data.platform === 'meta' ? <Megaphone className="h-5 w-5 text-[#0668E1]" /> : <FileSpreadsheet className="h-5 w-5 text-brand-orange" />}
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {data.client.business_name} — من {data.from} إلى {data.to}
              </span>
              {data.error && (
                <span className="text-amber-600 dark:text-amber-400 text-sm mr-auto">
                  {data.error === 'no_ad_account' && 'الزبون لم يختر حساب إعلاني'}
                  {data.error === 'no_token' && 'الزبون غير مرتبط بميتا'}
                  {data.error === 'campaigns_failed' && 'فشل جلب الحملات من ميتا'}
                </span>
              )}
            </div>

            {/* المقارنة الذكية: صرف | مبيعات الزبون | ROAS */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">إجمالي الصرف ({data.platform === 'meta' ? 'ميتا' : 'تيك توك'})</span>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalSpend.toFixed(2)} $</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">مبيعات الزبون (المدخلة)</span>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalSales.toFixed(2)} $</p>
              </div>
              <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-5 shadow-card dark:bg-brand-orange/20">
                <div className="flex items-center gap-2 text-brand-orange dark:text-brand-orange mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">ROAS (عائد على الإنفاق)</span>
                </div>
                <p className="text-2xl font-bold text-brand-orange">{roas.toFixed(2)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">كل 1$ صرف ≈ {roas.toFixed(1)} $ مبيعات</p>
              </div>
            </section>

            {/* ميتا: حملات الرسائل + حملات الزيارات */}
            {data.platform === 'meta' && !data.error && data.objectives && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/20">
                    <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">حملات الرسائل (Messages / Leads)</h2>
                    <span className="mr-auto text-sm text-slate-600 dark:text-slate-300">
                      إجمالي الصرف: {data.objectives.messages.spend.toFixed(2)} $ — عدد الرسائل: {data.objectives.messages.leads ?? 0}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">اسم الحملة</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الحالة</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الصرف ($)</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">عدد النتائج</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">تكلفة النتيجة ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.objectives.messages.campaigns.length === 0 ? (
                          <tr><td colSpan={5} className="py-4 text-center text-slate-500">لا حملات في هذا الهدف</td></tr>
                        ) : (
                          data.objectives.messages.campaigns.map((c) => (
                            <tr key={c.campaign_id} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{c.campaign_name}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{STATUS_LABEL[c.status] ?? c.status}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{(c.spend ?? 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{c.results_count ?? c.leads ?? 0}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{(c.cost_per_result ?? 0).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800/50 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
                    <MousePointer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">حملات الزيارات (Traffic / النقرات)</h2>
                    <span className="mr-auto text-sm text-slate-600 dark:text-slate-300">
                      إجمالي الصرف: {data.objectives.visits.spend.toFixed(2)} $ — النقرات: {data.objectives.visits.link_clicks ?? 0}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">اسم الحملة</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الحالة</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الصرف ($)</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">عدد النتائج (نقرات)</th>
                          <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">تكلفة النتيجة ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.objectives.visits.campaigns.length === 0 ? (
                          <tr><td colSpan={5} className="py-4 text-center text-slate-500">لا حملات في هذا الهدف</td></tr>
                        ) : (
                          data.objectives.visits.campaigns.map((c) => (
                            <tr key={c.campaign_id} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{c.campaign_name}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{STATUS_LABEL[c.status] ?? c.status}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{(c.spend ?? 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{c.results_count ?? c.link_clicks ?? 0}</td>
                              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{(c.cost_per_result ?? 0).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* تيك توك: جدول يومي */}
            {data.platform === 'tiktok' && data.daily_rows && data.daily_rows.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800/50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <FileSpreadsheet className="h-5 w-5 text-brand-orange" />
                  <h2 className="font-semibold text-slate-800 dark:text-white">التفصيل اليومي — TikTok</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">التاريخ</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الصرف ($)</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الرسائل</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الطلبات</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">مبلغ المبيعات ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.daily_rows.map((row) => (
                        <tr key={row.date} className="border-b border-slate-100 dark:border-slate-700">
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row.date}</td>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row.ad_spend.toFixed(2)}</td>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row.leads_count}</td>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row.orders_count}</td>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row.order_value.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {data.platform === 'tiktok' && (!data.daily_rows || data.daily_rows.length === 0) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-slate-500 dark:text-slate-400">لا توجد بيانات تيك توك لهذه الفترة. أدخل الزبون المبيعات من لوحته.</p>
              </div>
            )}
          </div>
        )}

        {!clientId && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card dark:border-slate-700 dark:bg-slate-800/50">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-slate-500 dark:text-slate-400">اختر زبوناً وتاريخ من–إلى لعرض التقرير الموحد.</p>
          </div>
        )}
      </div>

      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">إضافة زبون جديد</h2>
            <form onSubmit={handleAddClient} className="space-y-3">
              {addClientError && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{addClientError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الزبون</label>
                <input type="text" value={addClientForm.name} onChange={(e) => setAddClientForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                <input type="email" value={addClientForm.email} onChange={(e) => setAddClientForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور</label>
                <input type="password" value={addClientForm.password} onChange={(e) => setAddClientForm((p) => ({ ...p, password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" minLength={8} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم النشاط</label>
                <input type="text" value={addClientForm.business_name} onChange={(e) => setAddClientForm((p) => ({ ...p, business_name: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={addClientLoading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-orange py-2.5 font-medium text-white hover:bg-brand-orange-dark disabled:opacity-50">
                  {addClientLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إضافة'}
                </button>
                <button type="button" onClick={() => { setShowAddClient(false); setAddClientError(''); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
