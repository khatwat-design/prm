'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  api,
  createClient,
  getUnifiedReport,
  getDailyReport,
  getMetaRedirectUrl,
  getMetaAdAccounts,
  saveMetaAccount,
  syncMetaCampaigns,
  type UnifiedReportResponse,
  type DailyReportResponse,
  type MetaAdAccount,
} from '@/lib/api';
import type { CreateClientPayload } from '@/lib/api';
import type { DailyReportRow } from '@/lib/api';
import { MediaBuyerNav, type MediaBuyerSection } from '@/components/dashboard/MediaBuyerNav';

function formatDateAr(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' });
}
import {
  Loader2,
  Megaphone,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  ChevronDown,
  Link2,
  Check,
  Calendar,
} from 'lucide-react';

type PlatformToggle = 'meta' | 'tiktok';
type Client = { id: number; business_name: string; meta_connected?: boolean; user?: { name: string; email: string } };

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'شغالة',
  PAUSED: 'موقوفة',
  PENDING_REVIEW: 'قيد المراجعة',
};

function MediaBuyerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [metaAdAccounts, setMetaAdAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedMetaAccountId, setSelectedMetaAccountId] = useState('');
  const [loadingMetaAccounts, setLoadingMetaAccounts] = useState(false);
  const [savingMetaAccount, setSavingMetaAccount] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [metaConnectLoading, setMetaConnectLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<MediaBuyerSection>('sales');
  const [dailyReport, setDailyReport] = useState<DailyReportResponse | null>(null);
  const [dailyReportLoading, setDailyReportLoading] = useState(false);
  const [dailyReportError, setDailyReportError] = useState('');
  const [salesDayFilter, setSalesDayFilter] = useState<string | null>(null);

  const selectedClient = clientId ? clients.find((c) => String(c.id) === clientId) : null;

  /** تجميع صفوف التقرير اليومي حسب التاريخ (لصفحة المبيعات) */
  const salesByDate = (dailyReport?.rows ?? []).reduce<Record<string, DailyReportRow[]>>((acc, row) => {
    const d = row.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(row);
    return acc;
  }, {});
  const salesDates = Object.keys(salesByDate).sort((a, b) => b.localeCompare(a));

  function loadClients() {
    api<{ data: Client[] }>('/clients?per_page=100')
      .then((res) => setClients(res.data ?? []))
      .catch(() => setClients([]));
  }

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const meta = searchParams.get('meta');
    const cid = searchParams.get('client_id');
    if (meta === 'connected' && cid) {
      setClientId(cid);
      api<{ data: Client[] }>('/clients?per_page=100').then((res) => setClients(res.data ?? [])).catch(() => {});
      window.history.replaceState({}, '', '/mediabuyer');
    }
  }, [searchParams]);

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
    if (!clientId || !selectedClient?.meta_connected) {
      setMetaAdAccounts([]);
      setSelectedMetaAccountId('');
      return;
    }
    setLoadingMetaAccounts(true);
    getMetaAdAccounts(clientId)
      .then((res) => {
        setMetaAdAccounts(res.data ?? []);
      })
      .catch(() => setMetaAdAccounts([]))
      .finally(() => setLoadingMetaAccounts(false));
  }, [clientId, selectedClient?.meta_connected]);

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

  useEffect(() => {
    if (activeSection !== 'sales' || !clientId || !from || !to) {
      setDailyReport(null);
      setDailyReportError('');
      return;
    }
    setDailyReportLoading(true);
    setDailyReportError('');
    getDailyReport({ client_id: clientId, from, to, platform: platform === 'tiktok' ? 'tiktok' : platform === 'meta' ? 'other' : undefined })
      .then(setDailyReport)
      .catch((err) => setDailyReportError(err instanceof Error ? err.message : 'فشل تحميل تفاصيل المبيعات'))
      .finally(() => setDailyReportLoading(false));
  }, [activeSection, clientId, from, to, platform]);

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950" dir="rtl">
      <MediaBuyerNav
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onAddClient={() => setShowAddClient(true)}
      />
      <main className="md:mr-60 pt-14 md:pt-0 md:min-h-screen px-4 py-6 md:px-8 md:py-8">
        <div className="max-w-[1320px] mx-auto space-y-6">
          {activeSection === 'sales' ? (
            <>
              <div className="mb-2">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">المبيعات</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">اختر الزبون والفترة ثم اختر يوماً لعرض التفاصيل حسب المنصة.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 p-5 shadow-sm">
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
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/80 p-2">
                    <button type="button" onClick={() => setPlatform('meta')} className={`rounded-xl px-4 py-2 text-sm font-medium ${platform === 'meta' ? 'bg-[#0668E1] text-white' : 'text-slate-600 dark:text-slate-400'}`}>Meta</button>
                    <button type="button" onClick={() => setPlatform('tiktok')} className={`rounded-xl px-4 py-2 text-sm font-medium ${platform === 'tiktok' ? 'bg-black text-white' : 'text-slate-600 dark:text-slate-400'}`}>TikTok</button>
                  </div>
                </div>
              </div>
              {dailyReportError && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">{dailyReportError}</div>
              )}
              {dailyReportLoading && (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 p-10 flex flex-col items-center justify-center gap-4 shadow-sm">
                  <Loader2 className="h-10 w-10 animate-spin text-brand-orange" />
                  <p className="text-slate-500 dark:text-slate-400">جاري تحميل تفاصيل المبيعات...</p>
                </div>
              )}
              {dailyReport && !dailyReportLoading && (
                <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="h-5 w-5 text-brand-orange" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">المبيعات — {dailyReport.client.business_name}</h2>
                    <span className="mr-auto text-sm text-slate-600 dark:text-slate-300">من {dailyReport.from} إلى {dailyReport.to}</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">اختر يوماً لعرض التفاصيل حسب المنصة.</p>
                  {salesDates.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">لا توجد بيانات لهذه الفترة.</p>
                  ) : (
                    <>
                  <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-600 dark:bg-slate-800 px-3 py-2 mb-4">
                    <Calendar className="h-4 w-4 text-brand-orange shrink-0" />
                    <select
                      value={salesDayFilter ?? ''}
                      onChange={(e) => setSalesDayFilter(e.target.value || null)}
                      className="min-w-0 flex-1 rounded-xl border-0 bg-transparent py-0.5 text-sm text-slate-800 dark:text-slate-100"
                    >
                      <option value="">-- اختر يومًا --</option>
                      {salesDates.map((d) => (
                        <option key={d} value={d}>{formatDateAr(d)} — {d}</option>
                      ))}
                    </select>
                  </label>
                  <div className="space-y-3">
                    {!salesDayFilter ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                        اختر يوماً من القائمة أعلاه لعرض التفاصيل.
                      </p>
                    ) : salesByDate[salesDayFilter] ? (
                      (() => {
                        const dayRows = salesByDate[salesDayFilter];
                        const totalRow = dayRows.find((r) => r.is_total);
                        const platformRows = dayRows.filter((r) => !r.is_total);
                        const totalOrders = totalRow?.orders_count ?? platformRows.reduce((s, r) => s + r.orders_count, 0);
                        const totalValue = totalRow?.order_value ?? platformRows.reduce((s, r) => s + r.order_value, 0);
                        const totalSpend = totalRow?.ad_spend ?? platformRows.reduce((s, r) => s + r.ad_spend, 0);
                        const dayProfit = totalValue - totalSpend;
                        const dayRoas = totalSpend > 0 ? totalValue / totalSpend : 0;
                        return (
                          <details open className="rounded-2xl border border-slate-200 bg-slate-50/80 dark:bg-slate-800/50 overflow-hidden group">
                            <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none text-slate-800 dark:text-white hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition-colors">
                              <span className="font-medium">{formatDateAr(salesDayFilter)}</span>
                              <span className="text-sm text-slate-500 dark:text-slate-400 shrink-0">
                                {totalOrders} طلب — {totalValue.toFixed(2)} $ إيراد
                              </span>
                              <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0" />
                            </summary>
                            <div className="px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                                <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الطلبات</p>
                                  <p className="text-xl font-bold text-slate-800 dark:text-white tabular-nums">{totalOrders}</p>
                                </div>
                                <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الإيراد ($)</p>
                                  <p className="text-xl font-bold text-slate-800 dark:text-white tabular-nums">{totalValue.toFixed(2)}</p>
                                </div>
                                <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الصرف ($)</p>
                                  <p className="text-xl font-bold text-slate-800 dark:text-white tabular-nums">{totalSpend.toFixed(2)}</p>
                                </div>
                                <div className="rounded-2xl bg-white dark:bg-slate-800/80 p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الربح · ROAS</p>
                                  <p className={`text-xl font-bold tabular-nums ${dayProfit >= 0 ? 'text-brand-orange' : 'text-red-600 dark:text-red-400'}`}>
                                    {dayProfit.toFixed(2)} $ · {dayRoas.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">حسب المنصة</p>
                              <ul className="space-y-0 divide-y divide-slate-200 dark:divide-slate-700 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 overflow-hidden">
                                {platformRows.map((r) => (
                                  <li key={r.date + r.platform} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                    <div className="flex flex-wrap justify-between items-center gap-2">
                                      <span className="font-medium">{r.platform}</span>
                                      <span className="tabular-nums text-slate-600 dark:text-slate-400 text-left">
                                        {r.leads_count > 0 && <>{r.leads_count} رسالة · </>}
                                        {r.ad_spend > 0 && <>{r.ad_spend.toFixed(2)} $ صرف · </>}
                                        {r.orders_count} طلب — {r.order_value.toFixed(2)} $ إيراد
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                      تحويل {r.conversion_rate.toFixed(1)}% · CAC {r.cac.toFixed(2)} · ROAS {r.roas.toFixed(2)}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </details>
                        );
                      })()
                    ) : (
                      <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                        لا توجد بيانات لهذا اليوم.
                      </p>
                    )}
                  </div>
                    </>
                  )}
                </section>
              )}
              {!clientId && (
                <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 p-10 text-center shadow-sm">
                  <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
                  <p className="mt-4 text-slate-500 dark:text-slate-400">اختر زبوناً وتاريخ من–إلى لعرض المبيعات.</p>
                </div>
              )}
            </>
          ) : (
            <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">الحملات</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">صرف الإعلان وحملات ميتا/تيك توك — ROAS ومبيعات الزبون.</p>
        </div>
        {/* زر تبديل: Meta | TikTok */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 p-2 shadow-sm w-fit">
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

        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 p-5 shadow-sm">
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
                    <option key={c.id} value={c.id}>{c.business_name}{c.meta_connected ? ' ✓ ميتا' : ''}</option>
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
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 dark:border-slate-600 dark:bg-slate-100" />
            </div>
          </div>
        </div>

        {clientId && (
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">ربط ميتا لهذا العميل</h3>
            {!selectedClient?.meta_connected ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">الحساب غير مرتبط بميتا. اضغط لربط حساب فيسبوك للعميل.</p>
                <button
                  type="button"
                  disabled={metaConnectLoading}
                  onClick={() => {
                    setMetaConnectLoading(true);
                    getMetaRedirectUrl(clientId)
                      .then((r) => { if (r.url) window.location.href = r.url; })
                      .catch(() => setMetaConnectLoading(false));
                  }}
                  className="flex items-center gap-2 rounded-xl bg-[#0668E1] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
                >
                  {metaConnectLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  ربط ميتا
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px]">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">الحساب الإعلاني</label>
                  {loadingMetaAccounts ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> جاري الجلب...</div>
                  ) : (
                    <select
                      value={selectedMetaAccountId}
                      onChange={(e) => setSelectedMetaAccountId(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">اختر الحساب الإعلاني</option>
                      {metaAdAccounts.map((a) => (
                        <option key={a.id || a.account_id} value={a.id || a.account_id || ''}>{a.name || a.id || a.account_id || '—'}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  disabled={savingMetaAccount || !selectedMetaAccountId}
                  onClick={() => {
                    if (!selectedMetaAccountId) return;
                    setSavingMetaAccount(true);
                    saveMetaAccount(selectedMetaAccountId, clientId)
                      .then(() => { loadClients(); })
                      .finally(() => setSavingMetaAccount(false));
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 disabled:opacity-60"
                >
                  {savingMetaAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  حفظ الحساب
                </button>
                <button
                  type="button"
                  disabled={syncingMeta}
                  onClick={() => {
                    setSyncingMeta(true);
                    syncMetaCampaigns({ days: 30, client_id: clientId })
                      .then(() => loadClients())
                      .finally(() => setSyncingMeta(false));
                  }}
                  className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark disabled:opacity-70"
                >
                  {syncingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  سحب بيانات ميتا (30 يوم)
                </button>
              </div>
            )}
          </div>
        )}

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
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
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
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">إجمالي الصرف ({data.platform === 'meta' ? 'ميتا' : 'تيك توك'})</span>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalSpend.toFixed(2)} $</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">مبيعات الزبون (المدخلة)</span>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{totalSales.toFixed(2)} $</p>
              </div>
              <div className="rounded-2xl border border-brand-orange/30 bg-brand-orange/10 p-5 shadow-sm dark:bg-brand-orange/20">
                <div className="flex items-center gap-2 text-brand-orange dark:text-brand-orange mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">ROAS (عائد على الإنفاق)</span>
                </div>
                <p className="text-2xl font-bold text-brand-orange">{roas.toFixed(2)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">كل 1$ صرف ≈ {roas.toFixed(1)} $ مبيعات</p>
              </div>
            </section>

            {/* ميتا: الحملات (رسائل + زيارات في جدول واحد) */}
            {data.platform === 'meta' && !data.error && data.objectives && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                  <Megaphone className="h-5 w-5 text-[#0668E1]" />
                  <h2 className="font-semibold text-slate-800 dark:text-white">الحملات</h2>
                  <span className="mr-auto text-sm text-slate-600 dark:text-slate-300">
                    رسائل: {data.objectives.messages.spend.toFixed(2)} $ — زيارات: {data.objectives.visits.spend.toFixed(2)} $
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الهدف</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">اسم الحملة</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الحالة</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الصرف ($)</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">النتائج</th>
                        <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">تكلفة/نتيجة ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...(data.objectives.messages.campaigns.map((c) => ({ ...c, _type: 'رسائل' as const }))),
                        ...(data.objectives.visits.campaigns.map((c) => ({ ...c, _type: 'زيارات' as const }))),
                      ].length === 0 ? (
                        <tr><td colSpan={6} className="py-4 text-center text-slate-500">لا حملات</td></tr>
                      ) : (
                        [
                          ...(data.objectives.messages.campaigns.map((c) => ({ ...c, _type: 'رسائل' as const }))),
                          ...(data.objectives.visits.campaigns.map((c) => ({ ...c, _type: 'زيارات' as const }))),
                        ].map((c) => (
                          <tr key={c._type + c.campaign_id} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{c._type}</td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{c.campaign_name}</td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{STATUS_LABEL[c.status] ?? c.status}</td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{(c.spend ?? 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{c.results_count ?? c.leads ?? c.link_clicks ?? 0}</td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{(c.cost_per_result ?? 0).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* تيك توك: جدول يومي */}
            {data.platform === 'tiktok' && data.daily_rows && data.daily_rows.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 overflow-hidden">
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
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-slate-500 dark:text-slate-400">لا توجد بيانات تيك توك لهذه الفترة. أدخل الزبون المبيعات من لوحته.</p>
              </div>
            )}
          </div>
        )}

        {!clientId && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-4 text-slate-500 dark:text-slate-400">اختر زبوناً وتاريخ من–إلى لعرض التقرير الموحد.</p>
          </div>
        )}
            </>
          )}
        </div>
      </main>

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

export default function MediaBuyerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-brand-black" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    }>
      <MediaBuyerContent />
    </Suspense>
  );
}
