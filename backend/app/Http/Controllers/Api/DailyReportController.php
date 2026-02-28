<?php

namespace App\Http\Controllers\Api;

use App\Enums\Platform;
use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyReportController extends Controller
{
    /**
     * قائمة التقارير اليومية للزبون (حسب التاريخ والمنصة)
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط بهذا المستخدم.'], 403);
        }

        $reports = DailyReport::where('client_id', $client->id)
            ->when($request->query('from'), fn ($q) => $q->whereDate('date', '>=', $request->query('from')))
            ->when($request->query('to'), fn ($q) => $q->whereDate('date', '<=', $request->query('to')))
            ->orderByDesc('date')
            ->orderBy('platform')
            ->paginate($request->integer('per_page', 100));

        return response()->json($reports);
    }

    /**
     * إدخال (عدد الطلبات + مبلغ الطلبات) فقط لكل منصة — الزبون لا يدخل الصرف ولا عدد الرسائل
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط بهذا المستخدم.'], 403);
        }

        $validated = $request->validate([
            'date' => 'required|date',
            'platform' => 'required|string|in:'.implode(',', Platform::values()),
            'orders_count' => 'required|integer|min:0',
            'order_value' => 'required|numeric|min:0',
        ]);

        $report = DailyReport::updateOrCreate(
            [
                'client_id' => $client->id,
                'date' => $validated['date'],
                'platform' => $validated['platform'],
            ],
            [
                'orders_count' => $validated['orders_count'],
                'order_value' => $validated['order_value'],
                // leads_count و ad_spend يبقى 0 حتى يسحبهما النظام من API ميتا/تيك توك لاحقاً
            ]
        );

        return response()->json($report->fresh(), 201);
    }

    /**
     * حفظ مبيعات اليوم كمجموعة — مصفوفة من المنصات (للواجهة)
     * POST /api/daily-sales
     * Body: { "date": "YYYY-MM-DD", "entries": [ { "platform", "orders_count", "order_value" }, ... ] }
     */
    public function storeBulk(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط بهذا المستخدم.'], 403);
        }

        $validated = $request->validate([
            'date' => 'required|date',
            'entries' => 'required|array',
            'entries.*.platform' => 'required|string|in:'.implode(',', Platform::values()),
            'entries.*.orders_count' => 'required|integer|min:0',
            'entries.*.order_value' => 'required|numeric|min:0',
        ]);

        $saved = [];
        foreach ($validated['entries'] as $entry) {
            $report = DailyReport::updateOrCreate(
                [
                    'client_id' => $client->id,
                    'date' => $validated['date'],
                    'platform' => $entry['platform'],
                ],
                [
                    'orders_count' => $entry['orders_count'],
                    'order_value' => $entry['order_value'],
                ]
            );
            $saved[] = $report;
        }

        return response()->json(['message' => 'تم حفظ مبيعات اليوم بنجاح.', 'data' => $saved], 201);
    }
}
