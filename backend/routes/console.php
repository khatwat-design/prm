<?php

use App\Services\MetaAdsService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Artisan::command('app:sync-meta-ads', function () {
    $this->info('مزامنة بيانات ميتا (أمس)...');
    app(MetaAdsService::class)->syncYesterday();
    $this->info('تم.');
})->purpose('سحب الصرف وعدد الرسائل من Meta وتحديث daily_reports');

Schedule::command('app:sync-meta-ads')->dailyAt('01:00');
