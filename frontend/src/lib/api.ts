const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('khtwat_token');
}

/** مسح الجلسة من المتصفح وإعادة التوجيه لتسجيل الدخول (عند 401 أو عند تسجيل الخروج) */
export function clearSessionAndRedirectToLogin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('khtwat_token');
  localStorage.removeItem('khtwat_user');
  window.location.href = '/login';
}

export type User = { id: number; name: string; email: string; role: string };

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || 'فشل تسجيل الدخول');
  }
  return res.json();
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    clearSessionAndRedirectToLogin();
    throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
  }
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    const msg = (d && typeof d.message === 'string') ? d.message : (d && typeof d.message === 'object' && Array.isArray(d.message) ? d.message[0] : null);
    throw new Error(msg || `خطأ: ${res.status}`);
  }
  return res.json();
}

export const PLATFORMS = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'website', label: 'Website' },
] as const;

export type PlatformValue = (typeof PLATFORMS)[number]['value'];

export interface DailyReportRow {
  id: number;
  date: string;
  platform: string;
  leads_count: number;
  orders_count: number;
  ad_spend: number;
  order_value: number;
  cost_per_lead: number;
  conversion_rate: number;
  cac: number;
  profit_after_spend: number;
  roas: number;
  is_total?: boolean;
}

/** عنصر واحد لمبيعات منصة (لإرسال الحفظ اليومي) */
export interface DailySaleEntry {
  platform: PlatformValue;
  orders_count: number;
  order_value: number;
}

/**
 * حفظ مبيعات اليوم كمجموعة — POST /api/daily-sales
 * Body: { date, entries: DailySaleEntry[] }
 */
export async function submitDailySales(
  date: string,
  entries: DailySaleEntry[]
): Promise<{ message: string; data: unknown[] }> {
  return api('/daily-sales', {
    method: 'POST',
    body: JSON.stringify({ date, entries }),
  });
}
/** تقرير يومي واحد (من API الزبون) */
export interface DailyReportItem {
  id: number;
  date: string;
  platform: string;
  leads_count: number;
  orders_count: number;
  ad_spend: number;
  order_value: number;
  cost_per_lead: number;
  conversion_rate: number;
  cac: number;
  profit_after_spend: number;
  roas: number;
}
/** استجابة paginate للتقارير */
export interface DailyReportsResponse {
  data: DailyReportItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
export function getMyDailyReports(params: { from?: string; to?: string; per_page?: number }) {
  const q = new URLSearchParams();
  if (params.from) q.set('from', params.from);
  if (params.to) q.set('to', params.to);
  if (params.per_page) q.set('per_page', String(params.per_page));
  return api<DailyReportsResponse>(`/daily-reports?${q.toString()}`);
}
/** إنشاء زبون (ميديا باير) */
export interface CreateClientPayload {
  name: string;
  email: string;
  password: string;
  business_name: string;
}
export function createClient(payload: CreateClientPayload) {
  return api<{ id: number; business_name: string; user: { id: number; name: string; email: string; role: string } }>(
    '/clients',
    { method: 'POST', body: JSON.stringify(payload) }
  );
}

/** المستخدم الحالي + بيانات الزبون (meta_connected، fb_ad_account_id) */
export interface MeResponse {
  user: User;
  client?: {
    id: number;
    business_name: string;
    meta_connected: boolean;
    fb_ad_account_id: string | null;
  };
}
export function getMe() {
  return api<MeResponse>('/me');
}

/** تسجيل الخروج — إلغاء التوكن من الخادم ثم مسح الجلسة وإعادة التوجيه لصفحة الدخول */
export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // تجاهل خطأ الشبكة — نمسح الجلسة محلياً على أي حال
    }
  }
  clearSessionAndRedirectToLogin();
}

/** تقرير موحد: ميتا أو تيك توك + مبيعات الزبون + ROAS في رد واحد */
export interface UnifiedCampaignRow {
  campaign_id: string;
  campaign_name: string;
  objective?: string;
  status: string;
  spend: number;
  leads?: number;
  link_clicks?: number;
  results_count: number;
  cost_per_result: number;
}
export interface UnifiedReportResponse {
  platform: 'meta' | 'tiktok';
  client: { id: number; business_name: string };
  from: string;
  to: string;
  total_meta_spend?: number;
  total_spend?: number;
  sales: { total_order_value: number };
  roas: number;
  objectives?: {
    messages: { spend: number; leads: number; campaigns: UnifiedCampaignRow[] };
    visits: { spend: number; link_clicks: number; campaigns: UnifiedCampaignRow[] };
  };
  daily_rows?: Array<{ date: string; ad_spend: number; leads_count: number; orders_count: number; order_value: number }>;
  error?: string;
}
export function getUnifiedReport(params: { client_id: string; from: string; to: string; platform: 'meta' | 'tiktok' }) {
  const q = new URLSearchParams(params);
  return api<UnifiedReportResponse>(`/reports/unified?${q.toString()}`);
}

/** تقرير ميتا (للتوافق مع الاستدعاءات القديمة إن وُجدت) */
export interface MetaReportObjective {
  spend: number;
  leads?: number;
  link_clicks?: number;
  campaigns: Array<UnifiedCampaignRow & { campaign_id: string; campaign_name: string; objective: string; spend: number }>;
}
export interface MetaReportResponse {
  client: { id: number; business_name: string };
  from: string;
  to: string;
  objectives: { messages: MetaReportObjective; visits: MetaReportObjective };
  campaigns: Array<{ id: string; name: string; objective: string; effective_status: string }>;
  error?: string;
}
export function getMetaReport(params: { client_id: string; from: string; to: string }) {
  const q = new URLSearchParams(params);
  return api<MetaReportResponse>(`/reports/meta?${q.toString()}`);
}

export function getMetaRedirectUrl() {
  return api<{ url: string }>('/meta/redirect');
}

/** قائمة الحسابات الإعلانية لميتا */
export interface MetaAdAccount {
  id: string | null;
  account_id: string | null;
  name: string;
}
export function getMetaAdAccounts() {
  return api<{ data: MetaAdAccount[] }>('/meta/ad-accounts');
}

/** حفظ الحساب الإعلاني المختار. السحب يتم لاحقاً من الواجهة أو لوحة التحليلات. */
export function saveMetaAccount(ad_account_id: string) {
  return api<{ message: string; fb_ad_account_id: string }>('/meta/save-account', {
    method: 'POST',
    body: JSON.stringify({ ad_account_id }),
  });
}

/** سحب بيانات الحملات من ميتا (الصرف وعدد الرسائل) لنطاق الأيام وحفظها في التقارير اليومية */
export function syncMetaCampaigns(params?: { from?: string; to?: string; days?: number }) {
  const body: Record<string, string | number> = {};
  if (params?.from) body.from = params.from;
  if (params?.to) body.to = params.to;
  if (params?.days != null) body.days = params.days;
  return api<{ message: string; synced_days: number; from: string; to: string; errors: string[] }>(
    '/meta/sync',
    { method: 'POST', body: JSON.stringify(body || {}) }
  );
}
