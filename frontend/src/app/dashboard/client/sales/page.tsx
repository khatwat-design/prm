'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * إعادة توجيه إلى لوحة التحكم (محدد التاريخ والنموذج هناك)
 */
export default function ClientSalesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/client');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-brand-black" dir="rtl">
      <p className="text-slate-500">جاري التحويل...</p>
    </div>
  );
}
