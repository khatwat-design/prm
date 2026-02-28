'use client';

import { useState, useEffect } from 'react';
import { getMyDailyReports, type DailyReportItem } from '@/lib/api';
import { DailySalesForm } from './DailySalesForm';
import { Calendar, X } from 'lucide-react';

function formatToday(): string {
  return new Date().toISOString().slice(0, 10);
}

interface SalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError?: (message: string) => void;
  initialDate?: string;
}

export function SalesModal({ isOpen, onClose, onSuccess, onError, initialDate = formatToday() }: SalesModalProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dayData, setDayData] = useState<DailyReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getMyDailyReports({ from: selectedDate, to: selectedDate, per_page: 10 })
      .then((res) => setDayData(res.data || []))
      .catch(() => setDayData([]))
      .finally(() => setLoading(false));
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">إضافة المبيعات</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Calendar className="h-4 w-4 text-brand-orange" />
              تاريخ المبيعات
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
            </div>
          ) : (
            <DailySalesForm
              selectedDate={selectedDate}
              initialData={dayData}
              onSuccess={() => {
                onSuccess();
                onClose();
              }}
              onError={(msg) => onError?.(msg)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
