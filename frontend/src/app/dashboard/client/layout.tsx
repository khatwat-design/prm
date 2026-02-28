'use client';

import { ClientNav } from '@/components/dashboard/ClientNav';

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-brand-black" dir="rtl">
      <ClientNav />
      {/* منطقة المحتوى: على الهواتف تبدأ من تحت الشريط، على الشاشات الكبيرة تأخذ المساحة بجانب السايدبار */}
      <main className="md:mr-56 md:min-h-screen pt-14 md:pt-0 pb-8">
        <div className="mx-auto max-w-lg sm:max-w-2xl lg:max-w-4xl px-4 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
