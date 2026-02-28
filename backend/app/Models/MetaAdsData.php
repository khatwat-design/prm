<?php

namespace App\Models;

use App\Enums\Platform;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetaAdsData extends Model
{
    use HasFactory;

    protected $table = 'meta_ads_data';

    protected $fillable = [
        'client_id',
        'date',
        'platform',
        'leads_count',
        'spend',
        'clicks',
        'impressions',
    ];

    protected $casts = [
        'date' => 'date',
        'platform' => Platform::class,
        'spend' => 'decimal:2',
    ];

    /**
     * الزبون صاحب بيانات الإعلانات
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
