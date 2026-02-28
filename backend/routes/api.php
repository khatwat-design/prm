<?php

use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DailyReportController;
use App\Http\Controllers\Api\MetaAuthController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - خطوات (Khtwat)
|--------------------------------------------------------------------------
*/

// تسجيل الدخول وإصدار توكن (محدود: 5 محاولات/دقيقة لتقليل هجمات brute force)
Route::post('/login', [\App\Http\Controllers\Api\AuthController::class, 'login'])
    ->middleware('throttle:5,1');

// callback ميتا — بدون Sanctum (يُستدعى من فيسبوك بعد الموافقة)
Route::get('/meta/callback', [MetaAuthController::class, 'callback']);

Route::middleware('auth:sanctum')->group(function () {

    // المستخدم الحالي + بيانات الزبون (للزبون: meta_connected، fb_ad_account_id)
    Route::get('/me', [\App\Http\Controllers\Api\AuthController::class, 'me']);
    Route::post('/logout', [\App\Http\Controllers\Api\AuthController::class, 'logout']);

    // قائمة الزبائن — للميديا باير / الأدمن فقط
    Route::get('/clients', [ClientController::class, 'index'])
        ->middleware('can.manage.clients');
    Route::post('/clients', [ClientController::class, 'store'])
        ->middleware('can.manage.clients');

    // التقارير اليومية — الزبون يدخل (عدد الطلبات + مبلغ الطلبات) فقط لكل منصة
    Route::apiResource('daily-reports', DailyReportController::class)->only(['index', 'store']);

    // حفظ مبيعات اليوم كمجموعة (مصفوفة من المنصات) — للواجهة
    Route::post('/daily-sales', [DailyReportController::class, 'storeBulk']);

    // تقرير يومي لزبون (ميديا باير) — جدول مع توتال لكل يوم. platform=tiktok|other اختياري
    Route::get('/reports/daily', [ReportController::class, 'dailyReport'])
        ->middleware('can.manage.clients');
    // تقرير ميتا حسب هدف الحملة (رسائل / زيارات) + الحملات الشغالة والصرف من ميتا
    Route::get('/reports/meta', [ReportController::class, 'metaReport'])
        ->middleware('can.manage.clients');
    // تقرير موحد: ميتا أو تيك توك + مبيعات الزبون + ROAS في رد واحد
    Route::get('/reports/unified', [ReportController::class, 'unifiedReport'])
        ->middleware('can.manage.clients');

    // ميتا — ربط الحساب (redirect) + حسابات إعلانية + حفظ الحساب
    // StartSession مطلوب لأن Socialite يخزن state في الجلسة عند بناء رابط التوجيه
    Route::get('/meta/redirect', [MetaAuthController::class, 'redirect'])
        ->middleware(\Illuminate\Session\Middleware\StartSession::class);
    Route::get('/meta/ad-accounts', [MetaController::class, 'adAccounts']);
    Route::post('/meta/save-account', [MetaController::class, 'saveAccount']);
    Route::post('/meta/sync', [MetaController::class, 'sync']);
});
