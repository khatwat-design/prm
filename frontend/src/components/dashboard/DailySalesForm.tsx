'use client';

import { useState, useEffect } from 'react';
import { getProducts, submitDailySales, PLATFORMS, type PlatformValue, type Product } from '@/lib/api';
import type { DailyReportItem } from '@/lib/api';
import { PlatformCard } from './PlatformCard';
import { Save } from 'lucide-react';

interface PlatformEntry {
  mode: 'manual' | 'products';
  orders_count: number;
  order_value: number;
  items: { product_id: number; quantity: number; unit_price?: number }[];
}

interface DailySalesFormProps {
  selectedDate: string;
  initialData?: DailyReportItem[];
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

const emptyEntry = (): PlatformEntry => ({ mode: 'manual', orders_count: 0, order_value: 0, items: [] });
const emptyPlatforms = () =>
  Object.fromEntries(PLATFORMS.map((p) => [p.value, emptyEntry()])) as Record<PlatformValue, PlatformEntry>;

export function DailySalesForm({
  selectedDate,
  initialData = [],
  onSuccess,
  onError,
}: DailySalesFormProps) {
  const [platforms, setPlatforms] = useState(emptyPlatforms);
  const [products, setProducts] = useState<Product[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const next = emptyPlatforms();
    for (const r of initialData) {
      const p = (r.platform?.toLowerCase?.() ?? r.platform) as PlatformValue;
      if (p && next[p]) {
        next[p] = {
          mode: 'manual',
          orders_count: r.orders_count ?? 0,
          order_value: Number(r.order_value ?? 0),
          items: [],
        };
      }
    }
    setPlatforms(next);
  }, [selectedDate, initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const entries = PLATFORMS.map(({ value }) => {
      const entry = platforms[value];
      if (entry.mode === 'products' && entry.items.length > 0) {
        return { platform: value, items: entry.items.filter((i) => i.quantity > 0) };
      }
      return {
        platform: value,
        orders_count: entry.orders_count ?? 0,
        order_value: entry.order_value ?? 0,
      };
    });
    submitDailySales(selectedDate, entries)
      .then(() => {
        setPlatforms(emptyPlatforms());
        onSuccess?.();
      })
      .catch((err) => {
        onError?.(err instanceof Error ? err.message : 'حدث خطأ');
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {PLATFORMS.map(({ value, label }) => {
          const entry = platforms[value];
          const isManual = entry.mode === 'manual';
          return (
            <div
              key={value}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="flex items-center justify-between mb-3">
                {!isManual && <h3 className="text-base font-semibold text-slate-800 dark:text-white">{label}</h3>}
                {products.length > 0 && (
                  <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700/50 p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPlatforms((prev) => ({
                          ...prev,
                          [value]: { ...emptyEntry(), mode: 'manual', orders_count: 0, order_value: 0 },
                        }))
                      }
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${isManual ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      يدوي
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPlatforms((prev) => ({
                          ...prev,
                          [value]: { mode: 'products', orders_count: 0, order_value: 0, items: [] },
                        }))
                      }
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium ${!isManual ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                    >
                      بالمنتجات
                    </button>
                  </div>
                )}
              </div>
              {isManual ? (
                <PlatformCard
                  label={label}
                  platformValue={value}
                  ordersCount={entry.orders_count ?? 0}
                  orderValue={entry.order_value ?? 0}
                  onOrdersCountChange={(v) =>
                    setPlatforms((prev) => ({ ...prev, [value]: { ...prev[value], orders_count: v } }))
                  }
                  onOrderValueChange={(v) =>
                    setPlatforms((prev) => ({ ...prev, [value]: { ...prev[value], order_value: v } }))
                  }
                />
              ) : (
                <div className="space-y-2">
                  {products.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد منتجات. أضف منتجات من صفحة المنتجات.</p>
                  ) : (
                    products.map((prod) => {
                      const row = entry.items.find((i) => i.product_id === prod.id);
                      const qty = row?.quantity ?? 0;
                      return (
                        <div key={prod.id} className="flex items-center gap-2">
                          <span className="flex-1 text-sm text-slate-700 dark:text-slate-300 truncate">{prod.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">{Number(prod.price).toFixed(2)} $</span>
                          <input
                            type="number"
                            min={0}
                            value={qty === 0 ? '' : qty}
                            onChange={(e) => {
                              const v = parseInt(e.target.value, 10) || 0;
                              setPlatforms((prev) => {
                                const cur = prev[value];
                                if (cur.mode !== 'products') return prev;
                                const rest = cur.items.filter((i) => i.product_id !== prod.id);
                                const nextItems = v > 0 ? [...rest, { product_id: prod.id, quantity: v }] : rest;
                                return { ...prev, [value]: { ...cur, items: nextItems } };
                              });
                            }}
                            placeholder="0"
                            className="w-20 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-orange py-3.5 text-base font-semibold text-white shadow-card transition hover:bg-brand-orange-dark focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none dark:focus:ring-offset-brand-black"
      >
        <Save className="h-5 w-5" />
        {submitting ? 'جاري الحفظ...' : 'حفظ مبيعات اليوم'}
      </button>
    </form>
  );
}
