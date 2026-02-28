<?php

namespace App\Models;

use App\Enums\Platform;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyReport extends Model
{
    use HasFactory;

    protected $table = 'daily_reports';

    protected $fillable = [
        'client_id',
        'date',
        'platform',
        'leads_count',
        'orders_count',
        'ad_spend',
        'order_value',
    ];

    protected $casts = [
        'date' => 'date',
        'platform' => Platform::class,
        'ad_spend' => 'decimal:2',
        'order_value' => 'decimal:2',
    ];

    protected $appends = [
        'cost_per_lead',
        'conversion_rate',
        'cac',
        'profit_after_spend',
        'roas',
    ];

    /**
     * الزبون صاحب التقرير
     */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * تكلفة الرسالة/الزيارة = ad_spend / leads_count
     */
    protected function costPerLead(): Attribute
    {
        return Attribute::get(function (): float {
            $leads = (int) $this->leads_count;
            if ($leads <= 0) {
                return 0.0;
            }
            return round((float) $this->ad_spend / $leads, 2);
        });
    }

    /**
     * نسبة التحويل % = (orders_count / leads_count) * 100
     */
    protected function conversionRate(): Attribute
    {
        return Attribute::get(function (): float {
            $leads = (int) $this->leads_count;
            if ($leads <= 0) {
                return 0.0;
            }
            return round((int) $this->orders_count / $leads * 100, 2);
        });
    }

    /**
     * الاستحواذ (CAC) = ad_spend / orders_count
     */
    protected function cac(): Attribute
    {
        return Attribute::get(function (): float {
            $orders = (int) $this->orders_count;
            if ($orders <= 0) {
                return 0.0;
            }
            return round((float) $this->ad_spend / $orders, 2);
        });
    }

    /**
     * الربح بعد الصرف = order_value - ad_spend
     */
    protected function profitAfterSpend(): Attribute
    {
        return Attribute::get(function (): float {
            return round((float) $this->order_value - (float) $this->ad_spend, 2);
        });
    }

    /**
     * ROAS = order_value / ad_spend
     */
    protected function roas(): Attribute
    {
        return Attribute::get(function (): float {
            $spend = (float) $this->ad_spend;
            if ($spend <= 0) {
                return 0.0;
            }
            return round((float) $this->order_value / $spend, 2);
        });
    }
}
