<?php

namespace App\Http\Controllers\Api;

use App\Enums\Platform;
use App\Http\Controllers\Controller;
use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyReportController extends Controller
{
    /**
     * قائمة التقارير اليومية للزبون (حسب التاريخ والمنصة) مع بنود المبيعات
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط بهذا المستخدم.'], 403);
        }

        $reports = DailyReport::where('client_id', $client->id)
            ->with('items.product')
            ->when($request->query('from'), fn ($q) => $q->whereDate('date', '>=', $request->query('from')))
            ->when($request->query('to'), fn ($q) => $q->whereDate('date', '<=', $request->query('to')))
            ->orderByDesc('date')
            ->orderBy('platform')
            ->paginate($request->integer('per_page', 100));

        return response()->json($reports);
    }

    /**
     * إدخال مبيعات لكل منصة: إما (orders_count + order_value) أو بنود (items: product_id, quantity, unit_price?)
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط بهذا المستخدم.'], 403);
        }

        $productIds = $client->products()->pluck('id')->toArray();
        $rules = [
            'date' => 'required|date',
            'platform' => 'required|string|in:'.implode(',', Platform::values()),
            'orders_count' => 'required_without:items|nullable|integer|min:0',
            'order_value' => 'required_without:items|nullable|numeric|min:0',
            'items' => 'required_without:orders_count|nullable|array',
            'items.*.product_id' => 'required_with:items|integer|in:'.implode(',', $productIds ?: [0]),
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ];

        $validated = $request->validate($rules);

        $ordersCount = (int) ($validated['orders_count'] ?? 0);
        $orderValue = (float) ($validated['order_value'] ?? 0);

        if (! empty($validated['items'])) {
            $ordersCount = 0;
            $orderValue = 0;
            foreach ($validated['items'] as $row) {
                $product = Product::find($row['product_id']);
                $price = isset($row['unit_price']) ? (float) $row['unit_price'] : (float) $product->price;
                $qty = (int) $row['quantity'];
                $ordersCount += $qty;
                $orderValue += $price * $qty;
            }
        }

        $report = DailyReport::updateOrCreate(
            [
                'client_id' => $client->id,
                'date' => $validated['date'],
                'platform' => $validated['platform'],
            ],
            [
                'orders_count' => $ordersCount,
                'order_value' => round($orderValue, 2),
            ]
        );

        if (! empty($validated['items'])) {
            $report->items()->delete();
            foreach ($validated['items'] as $row) {
                DailyReportItem::create([
                    'daily_report_id' => $report->id,
                    'product_id' => $row['product_id'],
                    'quantity' => (int) $row['quantity'],
                    'unit_price' => isset($row['unit_price']) ? (float) $row['unit_price'] : null,
                ]);
            }
        }

        return response()->json($report->fresh(['items.product']), 201);
    }

    /**
     * حفظ مبيعات اليوم كمجموعة — مصفوفة من المنصات، مع إمكانية بنود (items) لكل منصة
     * Body: { "date": "YYYY-MM-DD", "entries": [ { "platform", "orders_count?", "order_value?", "items?": [{ "product_id", "quantity", "unit_price?" }] }, ... ] }
     */
    public function storeBulk(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط بهذا المستخدم.'], 403);
        }

        $productIds = $client->products()->pluck('id')->toArray();
        $validated = $request->validate([
            'date' => 'required|date',
            'entries' => 'required|array',
            'entries.*.platform' => 'required|string|in:'.implode(',', Platform::values()),
            'entries.*.orders_count' => 'nullable|integer|min:0',
            'entries.*.order_value' => 'nullable|numeric|min:0',
            'entries.*.items' => 'nullable|array',
            'entries.*.items.*.product_id' => 'integer|in:'.implode(',', $productIds ?: [0]),
            'entries.*.items.*.quantity' => 'integer|min:1',
            'entries.*.items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        $saved = [];
        foreach ($validated['entries'] as $entry) {
            $hasItems = ! empty($entry['items']);
            if (! $hasItems && (! isset($entry['orders_count']) || ! isset($entry['order_value']))) {
                return response()->json([
                    'message' => 'كل منصة تحتاج إما orders_count و order_value أو مصفوفة items (منتج + كمية).',
                ], 422);
            }
            if ($hasItems) {
                foreach ($entry['items'] as $row) {
                    if (empty($row['product_id']) || empty($row['quantity'])) {
                        return response()->json(['message' => 'كل بند في items يحتاج product_id و quantity.'], 422);
                    }
                }
            }
            $ordersCount = (int) ($entry['orders_count'] ?? 0);
            $orderValue = (float) ($entry['order_value'] ?? 0);

            if (! empty($entry['items'])) {
                $ordersCount = 0;
                $orderValue = 0;
                foreach ($entry['items'] as $row) {
                    $product = Product::find($row['product_id']);
                    $price = isset($row['unit_price']) ? (float) $row['unit_price'] : (float) $product->price;
                    $qty = (int) $row['quantity'];
                    $ordersCount += $qty;
                    $orderValue += $price * $qty;
                }
            }

            $report = DailyReport::updateOrCreate(
                [
                    'client_id' => $client->id,
                    'date' => $validated['date'],
                    'platform' => $entry['platform'],
                ],
                [
                    'orders_count' => $ordersCount,
                    'order_value' => round($orderValue, 2),
                ]
            );

            if (! empty($entry['items'])) {
                $report->items()->delete();
                foreach ($entry['items'] as $row) {
                    DailyReportItem::create([
                        'daily_report_id' => $report->id,
                        'product_id' => $row['product_id'],
                        'quantity' => (int) $row['quantity'],
                        'unit_price' => isset($row['unit_price']) ? (float) $row['unit_price'] : null,
                    ]);
                }
            }

            $saved[] = $report;
        }

        return response()->json(['message' => 'تم حفظ مبيعات اليوم بنجاح.', 'data' => $saved], 201);
    }
}
