'use client';

import type { PlatformValue } from '@/lib/api';

interface PlatformCardProps {
  label: string;
  platformValue: PlatformValue;
  ordersCount: number;
  orderValue: number;
  onOrdersCountChange: (value: number) => void;
  onOrderValueChange: (value: number) => void;
}

export function PlatformCard({
  label,
  ordersCount,
  orderValue,
  onOrdersCountChange,
  onOrderValueChange,
}: PlatformCardProps) {
  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-800/50"
      dir="rtl"
    >
      <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-3">{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`orders-${label}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            عدد الطلبات
          </label>
          <input
            id={`orders-${label}`}
            type="number"
            min={0}
            inputMode="numeric"
            value={ordersCount === 0 ? '' : ordersCount}
            onChange={(e) => onOrdersCountChange(parseInt(e.target.value, 10) || 0)}
            placeholder="0"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        <div>
          <label htmlFor={`value-${label}`} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            مبلغ الطلبات ($)
          </label>
          <input
            id={`value-${label}`}
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={orderValue === 0 ? '' : orderValue}
            onChange={(e) => onOrderValueChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>
    </div>
  );
}
