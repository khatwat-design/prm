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
        Schema::table('meta_ads_data', function (Blueprint $table) {
            $table->string('platform', 32)->default('facebook')->after('date'); // tiktok, whatsapp, messenger, facebook, website
            $table->unsignedInteger('leads_count')->default(0)->after('platform'); // عدد الرسائل (من API)
        });

        Schema::table('meta_ads_data', function (Blueprint $table) {
            $table->unique(['client_id', 'date', 'platform']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meta_ads_data', function (Blueprint $table) {
            $table->dropUnique(['client_id', 'date', 'platform']);
            $table->dropColumn(['platform', 'leads_count']);
        });
    }
};
