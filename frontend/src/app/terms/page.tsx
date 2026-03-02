import Link from 'next/link';

export const metadata = {
  title: 'شروط الاستخدام | خطوات',
  description: 'شروط استخدام منصة خطوات PRM',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 py-12 dark:bg-brand-black" dir="rtl">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">شروط الاستخدام</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">آخر تحديث: مارس 2026</p>

        <section className="space-y-4 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">1. القبول</h2>
          <p>
            باستخدامك منصة خطوات (PRM) فإنك توافق على هذه الشروط وسياسة الخصوصية.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">2. الخدمة</h2>
          <p>
            توفّر المنصة أدوات تقارير التسويق وربط الحملات (مثل ميتا) وفق الصلاحيات التي تمنحها. الخدمة تُقدّم «كما هي» ضمن نطاق الاستخدام المتفق عليه.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">3. الاستخدام المسؤول</h2>
          <p>
            أنت مسؤول عن حفظ بيانات الدخول واستخدام الخدمة وفق سياسات ميتا وأي منصات مربوطة. يُمنع الاستخدام غير المصرح به أو إساءة استخدام البيانات.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">4. التعديلات</h2>
          <p>
            قد نحدّث الشروط أو سياسة الخصوصية. سنوضح التغييرات الجوهرية عند الإمكان. متابعة استخدام الخدمة بعد التحديث تعني قبولك للتعديلات.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">5. التواصل</h2>
          <p>
            لأي استفسار بخصوص الشروط، تواصل معنا عبر القنوات الرسمية لشركة خطوات.
          </p>
        </section>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-600">
          <Link
            href="/login"
            className="text-brand-orange hover:underline font-medium"
          >
            ← العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
