import Link from 'next/link';
import { Home, LogIn } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 dark:bg-brand-black" dir="rtl">
      <div className="text-center max-w-md">
        <p className="text-8xl font-bold text-brand-orange/20 dark:text-brand-orange/30">404</p>
        <h1 className="mt-4 text-xl font-bold text-slate-800 dark:text-white">الصفحة غير موجودة</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          الرابط الذي طلبته غير صحيح أو تم نقل الصفحة.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-orange px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-orange-dark transition-colors"
          >
            <LogIn className="h-4 w-4" />
            تسجيل الدخول
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
