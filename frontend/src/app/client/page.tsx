'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * إعادة توجيه الزبون إلى لوحة التحكم الجديدة
 */
export default function ClientPage() {
  const router = useRouter();

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('khtwat_user') : null;
    if (!u) {
      router.replace('/login');
      return;
    }
    try {
      const user = JSON.parse(u);
      if (user.role === 'client') {
        router.replace('/dashboard/client');
      } else {
        router.replace(user.role === 'mediabuyer' || user.role === 'admin' ? '/mediabuyer' : '/login');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <p className="text-slate-500">جاري التحويل...</p>
    </div>
  );
}
