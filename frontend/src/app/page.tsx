'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('khtwat_user') : null;
    if (u) {
      try {
        const user = JSON.parse(u);
        if (user.role === 'client') router.replace('/dashboard/client');
        else if (user.role === 'admin' || user.role === 'mediabuyer') router.replace('/mediabuyer');
        else router.replace('/login');
      } catch {
        router.replace('/login');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <p className="text-slate-500">جاري التحويل...</p>
    </div>
  );
}
