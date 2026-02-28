<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'business_name',
        'meta_connected',
        'fb_ad_account_id',
        'long_lived_token',
    ];

    protected $casts = [
        'meta_connected' => 'boolean',
    ];

    /**
     * المستخدم المرتبط بالزبون
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * التقارير اليومية للزبون (حسب المنصة)
     */
    public function dailyReports(): HasMany
    {
        return $this->hasMany(DailyReport::class);
    }

    /**
     * بيانات إعلانات ميتا للزبون
     */
    public function metaAdsData(): HasMany
    {
        return $this->hasMany(MetaAdsData::class);
    }
}
