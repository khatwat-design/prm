'use client';

import { useState, useEffect } from 'react';
import { PLATFORMS, submitDailySales, type PlatformValue } from '@/lib/api';
import type { DailyReportItem } from '@/lib/api';
import { PlatformCard } from './PlatformCard';
import { Save } from 'lucide-react';

interface DailySalesFormProps {
  selectedDate: string;
  initialData?: DailyReportItem[];
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

const emptyPlatforms = () =>
  Object.fromEntries(
    PLATFORMS.map((p) => [p.value, { orders_count: 0, order_value: 0 }])
  ) as Record<PlatformValue, { orders_count: number; order_value: number }>;

export function DailySalesForm({
  selectedDate,
  initialData = [],
  onSuccess,
  onError,
}: DailySalesFormProps) {
  const [platforms, setPlatforms] = useState(emptyPlatforms);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const next = emptyPlatforms();
    for (const r of initialData) {
      const p = r.platform?.toLowerCase?.() ?? r.platform;
      if (p && next[p as PlatformValue]) {
        next[p as PlatformValue] = {
          orders_count: r.orders_count ?? 0,
          order_value: Number(r.order_value ?? 0),
        };
      }
    }
    setPlatforms(next);
  }, [selectedDate, initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const entries = PLATFORMS.map((p) => ({
      platform: p.value,
      orders_count: platforms[p.value]?.orders_count ?? 0,
      order_value: platforms[p.value]?.order_value ?? 0,
    }));
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
        {PLATFORMS.map(({ value, label }) => (
          <PlatformCard
            key={value}
            label={label}
            platformValue={value}
            ordersCount={platforms[value]?.orders_count ?? 0}
            orderValue={platforms[value]?.order_value ?? 0}
            onOrdersCountChange={(v) =>
              setPlatforms((prev) => ({ ...prev, [value]: { ...prev[value], orders_count: v } }))
            }
            onOrderValueChange={(v) =>
              setPlatforms((prev) => ({ ...prev, [value]: { ...prev[value], order_value: v } }))
            }
          />
        ))}
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
