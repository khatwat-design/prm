<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('daily_sales');

        Schema::create('daily_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('platform', 32); // tiktok, whatsapp, messenger, facebook, website
            $table->unsignedInteger('leads_count')->default(0);   // عدد الرسائل/الزيارات (من API لاحقاً)
            $table->unsignedInteger('orders_count')->default(0);  // عدد الطلبات (يدخلها الزبون)
            $table->decimal('ad_spend', 12, 2)->default(0);       // الصرف بالدولار (من API لاحقاً)
            $table->decimal('order_value', 12, 2)->default(0);      // مبلغ الطلبات (يدخلها الزبون)
            $table->timestamps();

            $table->unique(['client_id', 'date', 'platform']);
            $table->index(['client_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('daily_reports');

        Schema::create('daily_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('sales_count')->default(0);
            $table->decimal('revenue', 12, 2)->default(0);
            $table->timestamps();
            $table->unique(['client_id', 'date']);
        });
    }
};
