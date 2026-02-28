'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * التحليلات أصبحت على الصفحة الرئيسية — إعادة توجيه إلى لوحة التحكم
 */
export default function ClientAnalyticsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/client');
  }, [router]);
  return (
    <div className="flex items-center justify-center py-12">
      <p className="text-slate-500">جاري التحويل...</p>
    </div>
  );
}
