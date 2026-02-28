'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMyDailyReports, getMe, syncMetaCampaigns, PLATFORMS, type DailyReportItem } from '@/lib/api';
import { SalesModal } from '@/components/dashboard/SalesModal';
import { Toast, type ToastType } from '@/components/ui/Toast';
import {
  BarChart3,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Calendar,
  ChevronDown,
  Target,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

/** استخراج YYYY-MM-DD من أي صيغة تاريخ (ISO أو YYYY-MM-DD) */
function normalizeDateKey(apiDate: string): string {
  if (!apiDate || typeof apiDate !== 'string') return '';
  const trimmed = apiDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.length >= 10) return trimmed.slice(0, 10);
  return trimmed;
}

function formatDateAr(dateStr: string): string {
  const key = normalizeDateKey(dateStr);
  if (!key) return '—';
  const d = new Date(key + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('ar-SA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function platformLabel(platform: string): string {
  return PLATFORMS.find((p) => p.value === platform)?.label ?? platform;
}

function getDefaultFromTo(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function TrendBadge({ value, label }: { value: number | null; label?: string }) {
  if (value === null || value === undefined) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? '+' : ''}{value.toFixed(1)}% {label || 'مقارنة بالأمس'}
    </span>
  );
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [reports, setReports] = useState<DailyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState(() => getDefaultFromTo().from);
  const [dateTo, setDateTo] = useState(() => getDefaultFromTo().to);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [salesModalOpen, setSalesModalOpen] = useState(false);
  const [metaConnected, setMetaConnected] = useState<boolean | null>(null);
  const [chartRangeDays, setChartRangeDays] = useState<7 | 30>(7);
  const [dayFilter, setDayFilter] = useState<string | null>(null);

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
      .then((res) => setMetaConnected(res.client?.meta_connected ?? false))
      .catch(() => setMetaConnected(false));
  }, [mounted]);

  const loadReports = useCallback(() => {
    if (!mounted) return;
    setError('');
    setLoading(true);
    getMyDailyReports({ from: dateFrom, to: dateTo, per_page: 100 })
      .then((res) => setReports(res.data || []))
      .catch(() => setError('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  }, [mounted, dateFrom, dateTo]);

  /** مزامنة تلقائية مستمرة لتحليلات ميتا عند ربط الحساب */
  useEffect(() => {
    if (!mounted || metaConnected !== true) return;
    const runSync = () => {
      syncMetaCampaigns({ days: 30 })
        .then(() => loadReports())
        .catch(() => {});
    };
    runSync();
    const interval = setInterval(runSync, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mounted, metaConnected, loadReports]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const byDate = reports.reduce<Record<string, DailyReportItem[]>>((acc, r) => {
    const d = normalizeDateKey(String(r.date));
    if (!d) return acc;
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const totals = dates.reduce(
    (acc, dateStr) => {
      const dayReports = byDate[dateStr];
      acc.orders += dayReports.reduce((s, r) => s + (r.orders_count || 0), 0);
      acc.revenue += dayReports.reduce((s, r) => s + Number(r.order_value || 0), 0);
      acc.spend += dayReports.reduce((s, r) => s + Number(r.ad_spend || 0), 0);
      return acc;
    },
    { orders: 0, revenue: 0, spend: 0 }
  );
  const daysCount = dates.length || 1;
  const profit = totals.revenue - totals.spend;
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
  const chartDates = dates.slice(0, chartRangeDays);

  const lastDate = dates[0];
  const prevDate = dates[1];
  const lastDay = lastDate ? byDate[lastDate] : [];
  const prevDay = prevDate ? byDate[prevDate] : [];
  const lastSpend = lastDay.reduce((s, r) => s + Number(r.ad_spend || 0), 0);
  const lastRevenue = lastDay.reduce((s, r) => s + Number(r.order_value || 0), 0);
  const lastProfit = lastRevenue - lastSpend;
  const lastRoas = lastSpend > 0 ? lastRevenue / lastSpend : 0;
  const prevSpend = prevDay.reduce((s, r) => s + Number(r.ad_spend || 0), 0);
  const prevRevenue = prevDay.reduce((s, r) => s + Number(r.order_value || 0), 0);
  const prevProfit = prevRevenue - prevSpend;
  const prevRoas = prevSpend > 0 ? prevRevenue / prevSpend : 0;
  const trendSpend = prevSpend > 0 ? ((lastSpend - prevSpend) / prevSpend) * 100 : null;
  const trendRevenue = prevRevenue > 0 ? ((lastRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const trendProfit = prevProfit !== 0 ? ((lastProfit - prevProfit) / Math.abs(prevProfit)) * 100 : null;
  const trendRoas = prevRoas > 0 ? ((lastRoas - prevRoas) / prevRoas) * 100 : null;

  const areaChartData = [...chartDates].reverse().map((dateStr) => {
    const dayReports = byDate[dateStr] || [];
    const spend = dayReports.reduce((s, r) => s + Number(r.ad_spend || 0), 0);
    const revenue = dayReports.reduce((s, r) => s + Number(r.order_value || 0), 0);
    return { date: formatDateAr(dateStr), dateStr, spend: Math.round(spend * 100) / 100, revenue: Math.round(revenue * 100) / 100 };
  });

  const platformGroups: Record<string, number> = {};
  reports.forEach((r) => {
    const key = r.platform === 'facebook' || r.platform === 'messenger' ? 'Meta' : r.platform === 'tiktok' ? 'TikTok' : platformLabel(r.platform);
    platformGroups[key] = (platformGroups[key] || 0) + Number(r.order_value || 0);
  });
  const pieData = Object.entries(platformGroups).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#6366f1'];

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        <p className="text-slate-500 dark:text-slate-400">جاري تحميل التحليلات...</p>
      </div>
    );
  }

  return (
    <>
      {/* رأس الصفحة + حالة النظام */}
      <div className="relative flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">لوحة التحليلات</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-md">
              تتبع أداء مبيعاتك وإيراداتك وصرفك الإعلاني خلال الفترة المختارة.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {metaConnected !== null && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-sm font-medium shadow-sm ${
                  metaConnected
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20'
                    : 'bg-red-500/15 text-red-700 dark:text-red-400 dark:bg-red-500/20'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${metaConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {metaConnected ? 'مرتبط بميتا' : 'يحتاج ربط'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setSalesModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-orange-dark transition-all"
            >
              <Plus className="h-5 w-5" />
              إضافة المبيعات
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          أضف مبيعاتك اليومية بسرعة من الزر أعلاه — اختر التاريخ وأدخل الطلبات والإيراد حسب المنصة.
        </p>
      </div>

      {/* فلتر الفترة */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-brand-orange" />
          <span className="text-sm font-semibold text-slate-800 dark:text-white">اختر نطاق التاريخ</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          عرض التحليلات والرسوم البيانية للفترة من تاريخ البداية إلى تاريخ النهاية. يمكنك اختيار يوم واحد (نفس التاريخ في الحقلين) أو عدة أيام.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300 min-w-[2rem]">من</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              max={dateTo}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300 min-w-[2rem]">إلى</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل البيانات...</p>
        </div>
      ) : dates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-white">لا توجد بيانات لهذه الفترة</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            اختر نطاقاً آخر أو أضف مبيعات جديدة من الزر أدناه لبدء تتبع أدائك.
          </p>
          <button
            type="button"
            onClick={() => setSalesModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-medium text-white hover:bg-brand-orange-dark shadow-lg"
          >
            <Plus className="h-4 w-4" />
            إضافة المبيعات
          </button>
        </div>
      ) : (
        <>
          {/* Hero Metrics — 4 بطاقات تفاعلية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-medium">إجمالي الصرف</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{totals.spend.toFixed(2)} $</p>
              <div className="mt-2">
                <TrendBadge value={trendSpend} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">إجمالي المبيعات</span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{totals.revenue.toFixed(2)} $</p>
              <div className="mt-2">
                <TrendBadge value={trendRevenue} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <Target className="h-4 w-4" />
                <span className="text-xs font-medium">صافي الربح</span>
              </div>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-brand-orange' : 'text-red-600 dark:text-red-400'}`}>
                {profit.toFixed(2)} $
              </p>
              <div className="mt-2">
                <TrendBadge value={trendProfit} />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                <TrendingUp className="h-4 w-4 text-brand-orange" />
                <span className="text-xs font-medium">معدل العائد (ROAS)</span>
              </div>
              <p className="text-2xl font-bold text-brand-orange">{roas.toFixed(2)}</p>
              <div className="mt-2">
                <TrendBadge value={trendRoas} />
              </div>
            </div>
          </div>

          {/* Area Chart — الصرف والمبيعات خلال 7 أو 30 يوماً */}
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-white">الصرف والمبيعات</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  آخر {chartRangeDays} يوم — خط برتقالي: المبيعات، خط رمادي: الصرف.
                </p>
              </div>
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-700/50 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setChartRangeDays(7)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${chartRangeDays === 7 ? 'bg-brand-orange text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => setChartRangeDays(30)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${chartRangeDays === 30 ? 'bg-brand-orange text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                >
                  30 يوم
                </button>
              </div>
            </div>
            <div className="w-full h-[260px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={areaChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id="areaRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="areaSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64748b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-slate-500" />
                  <YAxis tick={{ fontSize: 11 }} className="text-slate-500" tickFormatter={(v) => `${v}$`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--tw-border-color)' }}
                    formatter={(value: number, name: string) => [`${Number(value).toFixed(2)} $`, name]}
                    labelFormatter={(label) => label}
                  />
                  <Area type="monotone" dataKey="revenue" name="المبيعات" stroke="#f97316" fill="url(#areaRevenue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="spend" name="الصرف" stroke="#64748b" fill="url(#areaSpend)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Pie Chart — توزيع المبيعات حسب المنصة */}
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
            <div className="flex items-center gap-2 mb-2">
              <PieChartIcon className="h-4 w-4 text-brand-orange" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">توزيع المبيعات حسب المنصة</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Meta (فيسبوك/ماسنجر) مقابل TikTok وباقي المنصات.
            </p>
            {pieData.length > 0 ? (
              <div className="w-full h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value.toFixed(2)} $`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">لا توجد مبيعات موزعة حسب المنصة لهذه الفترة.</p>
            )}
          </section>

          {/* تفصيل يوم بيوم */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:bg-brand-black/40">
            <div className="flex flex-col gap-3 mb-4">
              <h2 className="text-base font-semibold text-slate-800 dark:text-white">تفصيل كل يوم</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اضغط على أي يوم لرؤية الأرقام الكاملة وتوزيع المبيعات حسب المنصة.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                  <Calendar className="h-4 w-4 text-brand-orange shrink-0" />
                  <input
                    type="date"
                    value={dayFilter ?? ''}
                    min={dateFrom}
                    max={dateTo}
                    onChange={(e) => setDayFilter(e.target.value || null)}
                    className="min-w-0 flex-1 rounded-xl border-0 bg-transparent py-0.5 text-sm text-slate-800 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]"
                    title="اختر يوم"
                  />
                </label>
              </div>
            </div>
            <div className="space-y-3">
              {!dayFilter ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  اختر يوماً من التقويم أعلاه لعرض التفاصيل.
                </p>
              ) : (
                (dayFilter && byDate[dayFilter] ? [dayFilter] : []).map((dateStr) => {
                const dayReports = byDate[dateStr];
                const totalOrders = dayReports.reduce((s, r) => s + (r.orders_count || 0), 0);
                const totalValue = dayReports.reduce((s, r) => s + Number(r.order_value || 0), 0);
                const totalSpend = dayReports.reduce((s, r) => s + Number(r.ad_spend || 0), 0);
                const dayProfit = totalValue - totalSpend;
                const dayRoas = totalSpend > 0 ? totalValue / totalSpend : 0;
                return (
                  <details
                    key={dateStr}
                    className="rounded-2xl border border-slate-200 bg-slate-50/80 dark:bg-slate-800/50 overflow-hidden group"
                    open={!!dayFilter}
                  >
                    <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none text-slate-800 dark:text-white hover:bg-slate-100/80 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="font-medium">{formatDateAr(dateStr)}</span>
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
                        {dayReports.map((r) => (
                          <li key={r.id} className="flex flex-wrap justify-between items-center gap-2 px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">{platformLabel(r.platform)}</span>
                            <span className="tabular-nums text-slate-600 dark:text-slate-400 text-left">
                              {(r.leads_count ?? 0) > 0 && <>{r.leads_count} رسالة · </>}
                              {(Number(r.ad_spend) || 0) > 0 && <>{Number(r.ad_spend).toFixed(2)} $ صرف · </>}
                              {r.orders_count} طلب — {Number(r.order_value).toFixed(2)} $ إيراد
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                );
              })
              )}
              {dayFilter && !byDate[dayFilter] && (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                  لا توجد بيانات للتاريخ المختار.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      <SalesModal
        isOpen={salesModalOpen}
        onClose={() => setSalesModalOpen(false)}
        onSuccess={() => {
          setToast({ message: 'تم حفظ المبيعات بنجاح.', type: 'success' });
          loadReports();
        }}
        onError={(msg) => setToast({ message: msg, type: 'error' })}
      />

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
