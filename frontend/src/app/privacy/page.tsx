import Link from 'next/link';

export const metadata = {
  title: 'سياسة الخصوصية | خطوات',
  description: 'سياسة الخصوصية لاستخدام منصة خطوات PRM',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 py-12 dark:bg-brand-black" dir="rtl">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">سياسة الخصوصية</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">آخر تحديث: مارس 2026</p>

        <section className="space-y-4 text-slate-700 dark:text-slate-300">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">1. مقدمة</h2>
          <p>
            منصة خطوات (PRM) تُقدّم خدمات تقارير التسويق وإدارة الحملات. نلتزم بحماية بياناتك الشخصية وبيانات أعمالك وفقاً لأفضل الممارسات.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">2. البيانات التي نجمعها</h2>
          <p>
            نجمع البيانات اللازمة لتشغيل الخدمة: البريد الإلكتروني، اسم المستخدم، وبيانات مرتبطة بحسابك (مثل ربط حساب ميتا/فيسبوك لسحب بيانات الإعلانات والتقارير عند موافقتك).
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">3. استخدام البيانات</h2>
          <p>
            نستخدم البيانات لتقديم الخدمة، تحسين المنصة، وإرسال تنبيهات ضرورية متعلقة بحسابك. لا نبيع بياناتك الشخصية لأطراف ثالثة.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">4. الربط مع ميتا (فيسبوك)</h2>
          <p>
            عند ربط حساب ميتا، نستخدم الصلاحيات التي تمنحها لنا فقط لسحب بيانات الحملات الإعلانية والتقارير ضمن نطاق الخدمة. نلتزم بسياسات ميتا وقواعد استخدام واجهاتها البرمجية.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">5. الأمان</h2>
          <p>
            نحمي بياناتك عبر تشفير الاتصال (HTTPS) وإجراءات أمنية مناسبة على الخوادم.
          </p>

          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">6. التواصل</h2>
          <p>
            لأي استفسار حول الخصوصية أو طلب حذف بياناتك، تواصل معنا عبر القنوات الرسمية لشركة خطوات.
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
