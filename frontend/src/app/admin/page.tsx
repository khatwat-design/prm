'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getOverviewStats,
  getUsers,
  createUser,
  updateUser,
  type OverviewStats,
  type ApiUser,
} from '@/lib/api';
import { Navbar } from '@/components/layout/Navbar';
import { LogOut, Loader2, Users, BarChart3, UserPlus, Pencil, Check, X } from 'lucide-react';
import { logout } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [statsFrom, setStatsFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [statsTo, setStatsTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({ name: '', email: '', username: '', password: '', role: 'client' as string });
  const [editForm, setEditForm] = useState<Record<number, Partial<ApiUser>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const u = localStorage.getItem('khtwat_user');
    if (!u) {
      router.replace('/login');
      return;
    }
    const user = JSON.parse(u);
    if (user.role !== 'admin') {
      router.replace(user.role === 'client' ? '/dashboard/client' : '/mediabuyer');
      return;
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!mounted) return;
    setStatsLoading(true);
    const from = statsFrom || undefined;
    const to = statsTo || undefined;
    getOverviewStats({ from, to })
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, [mounted, statsFrom, statsTo]);

  useEffect(() => {
    if (!mounted) return;
    setUsersLoading(true);
    getUsers({ per_page: 100 })
      .then((res) => setUsers(res.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [mounted]);

  function loadUsers() {
    getUsers({ per_page: 100 })
      .then((res) => setUsers(res.data ?? []))
      .catch(() => {});
  }

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    createUser({
      name: addForm.name,
      email: addForm.email,
      username: addForm.username || undefined,
      password: addForm.password,
      role: addForm.role,
    })
      .then(() => {
        setShowAddUser(false);
        setAddForm({ name: '', email: '', username: '', password: '', role: 'client' });
        loadUsers();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'فشل الإضافة'))
      .finally(() => setSaving(false));
  }

  function handleUpdateUser(id: number) {
    const payload = editForm[id];
    if (!payload) return;
    setSaving(true);
    const send: Parameters<typeof updateUser>[1] = {
      name: payload.name,
      email: payload.email,
      username: payload.username ?? undefined,
      role: payload.role,
      is_active: payload.is_active,
    };
    updateUser(id, send)
      .then(() => {
        setEditingId(null);
        setEditForm((prev) => ({ ...prev, [id]: {} }));
        loadUsers();
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'فشل التحديث'))
      .finally(() => setSaving(false));
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-brand-black" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-brand-black p-4 md:p-8" dir="rtl">
      <div className="max-w-[1200px] mx-auto">
        <Navbar
          title="لوحة الأدمن"
          subtitle="نظرة شاملة وإدارة المستخدمين"
          rightSlot={
            <div className="flex items-center gap-2">
              <Link
                href="/mediabuyer"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                التقارير والزبائن
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
            </div>
          }
        />

        {/* نظرة شاملة */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-brand-orange" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">نظرة شاملة</h2>
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">من</span>
              <input type="date" value={statsFrom} onChange={(e) => setStatsFrom(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">إلى</span>
              <input type="date" value={statsTo} onChange={(e) => setStatsTo(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
            </label>
          </div>
          {statsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-8 w-8 animate-spin text-brand-orange" /></div>
          ) : stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/80 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي المبيعات ($)</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.total_order_value.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/80 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">إجمالي الصرف ($)</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.total_ad_spend.toFixed(2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/80 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">عدد العملاء</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.clients_count}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/80 p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">المستخدمون النشطون</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{stats.users_count}</p>
              </div>
            </div>
          )}
        </section>

        {/* المستخدمون */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-orange" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">المستخدمون</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark"
            >
              <UserPlus className="h-4 w-4" />
              إضافة مستخدم
            </button>
          </div>
          {error && <div className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>}
          {usersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-brand-orange" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                    <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الاسم</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">البريد / اليوزرنيم</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الدور</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">الحالة</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">العميل</th>
                    <th className="text-right py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700">
                      {editingId === user.id ? (
                        <>
                          <td className="py-2 px-3"><input type="text" value={editForm[user.id]?.name ?? user.name} onChange={(e) => setEditForm((p) => ({ ...p, [user.id]: { ...p[user.id], name: e.target.value } }))} className="w-full rounded border border-slate-200 px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></td>
                          <td className="py-2 px-3"><input type="text" value={editForm[user.id]?.email ?? user.email} onChange={(e) => setEditForm((p) => ({ ...p, [user.id]: { ...p[user.id], email: e.target.value } }))} className="w-full rounded border border-slate-200 px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" /></td>
                          <td className="py-2 px-3">
                            <select value={editForm[user.id]?.role ?? user.role} onChange={(e) => setEditForm((p) => ({ ...p, [user.id]: { ...p[user.id], role: e.target.value } }))} className="rounded border border-slate-200 px-2 py-1 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                              <option value="admin">أدمن</option>
                              <option value="mediabuyer">ميديا باير</option>
                              <option value="client">عميل</option>
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <label className="flex items-center gap-1">
                              <input type="checkbox" checked={editForm[user.id]?.is_active ?? user.is_active} onChange={(e) => setEditForm((p) => ({ ...p, [user.id]: { ...p[user.id], is_active: e.target.checked } }))} />
                              <span className="text-xs">نشط</span>
                            </label>
                          </td>
                          <td className="py-2 px-3 text-slate-500">{user.client?.business_name ?? '—'}</td>
                          <td className="py-2 px-3">
                            <button type="button" onClick={() => handleUpdateUser(user.id)} disabled={saving} className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><Check className="h-4 w-4" /></button>
                            <button type="button" onClick={() => { setEditingId(null); setEditForm((p) => ({ ...p, [user.id]: {} })); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="h-4 w-4" /></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{user.name}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{user.email}{user.username ? ` / ${user.username}` : ''}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{user.role === 'admin' ? 'أدمن' : user.role === 'mediabuyer' ? 'ميديا باير' : 'عميل'}</td>
                          <td className="py-2 px-3">{user.is_active ? <span className="text-green-600 dark:text-green-400">نشط</span> : <span className="text-red-600 dark:text-red-400">معطّل</span>}</td>
                          <td className="py-2 px-3 text-slate-500">{user.client?.business_name ?? '—'}</td>
                          <td className="py-2 px-3">
                            <button type="button" onClick={() => { setEditingId(user.id); setEditForm((p) => ({ ...p, [user.id]: { name: user.name, email: user.email, username: user.username, role: user.role, is_active: user.is_active } })); }} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="h-4 w-4" /></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">إضافة مستخدم</h2>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                <input type="email" value={addForm.email} onChange={(e) => setAddForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اليوزرنيم (اختياري)</label>
                <input type="text" value={addForm.username} onChange={(e) => setAddForm((p) => ({ ...p, username: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور</label>
                <input type="password" value={addForm.password} onChange={(e) => setAddForm((p) => ({ ...p, password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" minLength={8} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الدور</label>
                <select value={addForm.role} onChange={(e) => setAddForm((p) => ({ ...p, role: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
                  <option value="admin">أدمن</option>
                  <option value="mediabuyer">ميديا باير</option>
                  <option value="client">عميل</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-orange py-2.5 font-medium text-white hover:bg-brand-orange-dark disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إضافة'}
                </button>
                <button type="button" onClick={() => { setShowAddUser(false); setError(''); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
