<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyReportItem extends Model
{
    protected $table = 'daily_report_items';

    protected $fillable = [
        'daily_report_id',
        'product_id',
        'quantity',
        'unit_price',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
    ];

    public function dailyReport(): BelongsTo
    {
        return $this->belongsTo(DailyReport::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * المبلغ الإجمالي لهذا البند = quantity * (unit_price ?? product.price)
     */
    public function getLineTotalAttribute(): float
    {
        $price = $this->unit_price ?? $this->product?->price ?? 0;

        return round((float) $price * (int) $this->quantity, 2);
    }
}
