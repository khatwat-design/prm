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

export type User = { id: number; name: string; email: string; username?: string | null; role: string };

export async function login(emailOrUsername: string, password: string): Promise<{ token: string; user: User }> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailOrUsername, password }),
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

/** بند مبيعات بالمنتج + كمية (اختياري — إن وُجد يحسب الطلبات والإيراد تلقائياً) */
export interface DailySaleItemEntry {
  product_id: number;
  quantity: number;
  unit_price?: number;
}

/** عنصر واحد لمبيعات منصة (لإرسال الحفظ اليومي) — إما orders_count+order_value أو items */
export interface DailySaleEntry {
  platform: PlatformValue;
  orders_count?: number;
  order_value?: number;
  items?: DailySaleItemEntry[];
}

/**
 * حفظ مبيعات اليوم كمجموعة — POST /api/daily-sales
 * Body: { date, entries: DailySaleEntry[] } — كل entry إما orders_count+order_value أو items (منتج+كمية)
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
/** بند مبيعات (منتج + كمية) في التقرير اليومي */
export interface DailyReportLineItem {
  id: number;
  daily_report_id: number;
  product_id: number;
  quantity: number;
  unit_price: number | null;
  product?: { id: number; name: string; price: string };
}

/** تقرير يومي واحد (من API الزبون) */
export interface DailyReportItem {
  id: number;
  date: string;
  platform: string;
  leads_count: number;
  link_clicks_count?: number;
  orders_count: number;
  ad_spend: number;
  order_value: number;
  cost_per_lead: number;
  conversion_rate: number;
  cac: number;
  profit_after_spend: number;
  roas: number;
  conversion_from_messages?: number;
  conversion_from_visits?: number;
  items?: DailyReportLineItem[];
}

/** منتج عميل */
export interface Product {
  id: number;
  client_id: number;
  name: string;
  price: string;
  sort_order: number;
}

export function getProducts() {
  return api<Product[]>('/products');
}

export function createProduct(payload: { name: string; price: number; sort_order?: number }) {
  return api<Product>('/products', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateProduct(id: number, payload: { name?: string; price?: number; sort_order?: number }) {
  return api<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteProduct(id: number) {
  return api<{ message: string }>(`/products/${id}`, { method: 'DELETE' });
}

export async function updateProfile(payload: { name?: string; username?: string | null }) {
  const res = await api<{ user: User }>('/me', { method: 'PATCH', body: JSON.stringify(payload) });
  return res.user;
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

/** تقرير يومي لزبون — تفاصيل المبيعات حسب التاريخ والمنصة (للميديا باير) */
export interface DailyReportRow {
  date: string;
  platform: string;
  is_total: boolean;
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
export interface DailyReportResponse {
  client: { id: number; business_name: string };
  from: string;
  to: string;
  platform_filter: string | null;
  rows: DailyReportRow[];
}
export function getDailyReport(params: { client_id: string; from: string; to: string; platform?: string }) {
  const q = new URLSearchParams({ client_id: params.client_id, from: params.from, to: params.to });
  if (params.platform) q.set('platform', params.platform);
  return api<DailyReportResponse>(`/reports/daily?${q.toString()}`);
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

/** للميديا باير: مرّر client_id لربط ذلك العميل. للزبون: لا تحتاج client_id. */
export function getMetaRedirectUrl(clientId?: string | number) {
  const q = clientId != null ? `?client_id=${clientId}` : '';
  return api<{ url: string }>(`/meta/redirect${q}`);
}

/** قائمة الحسابات الإعلانية لميتا. للميديا باير: مرّر client_id. */
export interface MetaAdAccount {
  id: string | null;
  account_id: string | null;
  name: string;
}
export function getMetaAdAccounts(clientId?: string | number) {
  const q = clientId != null ? `?client_id=${clientId}` : '';
  return api<{ data: MetaAdAccount[] }>(`/meta/ad-accounts${q}`);
}

/** حفظ الحساب الإعلاني. للميديا باير: مرّر client_id في الـ body. */
export function saveMetaAccount(ad_account_id: string, clientId?: string | number) {
  const body: Record<string, string | number> = { ad_account_id };
  if (clientId != null) body.client_id = Number(clientId);
  return api<{ message: string; fb_ad_account_id: string }>('/meta/save-account', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** سحب بيانات الحملات من ميتا. للميديا باير: مرّر client_id في الـ body. */
export function syncMetaCampaigns(params?: { from?: string; to?: string; days?: number; client_id?: string | number }) {
  const body: Record<string, string | number> = {};
  if (params?.from) body.from = params.from;
  if (params?.to) body.to = params.to;
  if (params?.days != null) body.days = params.days;
  if (params?.client_id != null) body.client_id = Number(params.client_id);
  return api<{ message: string; synced_days: number; from: string; to: string; errors: string[] }>(
    '/meta/sync',
    { method: 'POST', body: JSON.stringify(body || {}) }
  );
}

/** نظرة شاملة — إحصائيات مع فلترة (ميديا باير + أدمن) */
export interface OverviewStats {
  total_order_value: number;
  total_ad_spend: number;
  clients_count: number;
  users_count: number;
  from?: string;
  to?: string;
  client_id?: number;
}
export function getOverviewStats(params?: { from?: string; to?: string; client_id?: string | number }) {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.client_id != null) q.set('client_id', String(params.client_id));
  const query = q.toString();
  return api<OverviewStats>(`/overview/stats${query ? `?${query}` : ''}`);
}

/** إدارة المستخدمين — أدمن فقط */
export interface ApiUser {
  id: number;
  name: string;
  email: string;
  username: string | null;
  role: string;
  is_active: boolean;
  client?: { id: number; business_name: string; meta_connected: boolean } | null;
}
export function getUsers(params?: { search?: string; role?: string; per_page?: number }) {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.role) q.set('role', params.role);
  if (params?.per_page) q.set('per_page', String(params.per_page));
  const query = q.toString();
  return api<{ data: ApiUser[]; current_page: number; last_page: number; total: number }>(`/users${query ? `?${query}` : ''}`);
}
export function createUser(payload: { name: string; email: string; username?: string; password: string; role: string; client_id?: number }) {
  return api<ApiUser>('/users', { method: 'POST', body: JSON.stringify(payload) });
}
export function updateUser(id: number, payload: { name?: string; email?: string; username?: string | null; password?: string; role?: string; is_active?: boolean }) {
  return api<ApiUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}
