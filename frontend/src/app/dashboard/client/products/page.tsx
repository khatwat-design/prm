'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getProducts, createProduct, updateProduct, deleteProduct, type Product } from '@/lib/api';
import { Toast, type ToastType } from '@/components/ui/Toast';
import { Package, Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';

export default function ClientProductsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const loadProducts = useCallback(() => {
    if (!mounted) return;
    setLoading(true);
    getProducts()
      .then(setProducts)
      .catch(() => setToast({ message: 'فشل تحميل المنتجات.', type: 'error' }))
      .finally(() => setLoading(false));
  }, [mounted]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', price: '' });
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price) });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm({ name: '', price: '' });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const price = parseFloat(form.price.replace(/,/g, '.'));
    if (!name || Number.isNaN(price) || price < 0) {
      setToast({ message: 'الاسم والسعر مطلوبان والسعر يجب أن يكون رقماً موجباً.', type: 'error' });
      return;
    }
    setSaving(true);
    if (editing) {
      updateProduct(editing.id, { name, price })
        .then(() => {
          setToast({ message: 'تم تحديث المنتج.', type: 'success' });
          closeModal();
          loadProducts();
        })
        .catch((err) => setToast({ message: err instanceof Error ? err.message : 'فشل التحديث.', type: 'error' }))
        .finally(() => setSaving(false));
    } else {
      createProduct({ name, price })
        .then(() => {
          setToast({ message: 'تم إضافة المنتج.', type: 'success' });
          closeModal();
          loadProducts();
        })
        .catch((err) => setToast({ message: err instanceof Error ? err.message : 'فشل الإضافة.', type: 'error' }))
        .finally(() => setSaving(false));
    }
  }

  function handleDelete(id: number) {
    if (!confirm('حذف هذا المنتج؟ لن يُحذف من المبيعات المسجلة سابقاً.')) return;
    setDeletingId(id);
    deleteProduct(id)
      .then(() => {
        setToast({ message: 'تم حذف المنتج.', type: 'success' });
        loadProducts();
      })
      .catch((err) => setToast({ message: err instanceof Error ? err.message : 'فشل الحذف.', type: 'error' }))
      .finally(() => setDeletingId(null));
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-500">جاري التحميل...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">المنتجات</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            أضف منتجاتك ثم اخترها عند إدخال المبيعات (منتج + كمية) من صفحة التحليلات.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-2xl bg-brand-orange px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-orange-dark transition-all"
        >
          <Plus className="h-5 w-5" />
          إضافة منتج
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-brand-orange" />
          <p className="text-slate-500 dark:text-slate-400">جاري تحميل المنتجات...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-white">لا توجد منتجات بعد</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            أضف منتجاتك لاستخدامها عند إدخال المبيعات بالمنتج والكمية.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-medium text-white hover:bg-brand-orange-dark shadow-lg"
          >
            <Plus className="h-4 w-4" />
            إضافة منتج
          </button>
        </div>
      ) : (
        <ul className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800/50 divide-y divide-slate-200 dark:divide-slate-700 overflow-hidden">
          {products.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div>
                <p className="font-medium text-slate-800 dark:text-white">{p.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{Number(p.price).toFixed(2)} $</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded-xl p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
                  aria-label="تعديل"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="rounded-xl p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-50"
                  aria-label="حذف"
                >
                  {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {editing ? 'تعديل المنتج' : 'إضافة منتج'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">اسم المنتج</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                required
              />
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">السعر ($)</label>
              <input
                type="text"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                placeholder="0.00"
                required
              />
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark disabled:opacity-70"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {editing ? 'حفظ' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
