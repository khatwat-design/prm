<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\DailyReport;
use App\Services\MetaAdsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * تقارير للميديا باير — جدول يطابق شكل CSV مع تجميع (توتال) لكل يوم
 */
class ReportController extends Controller
{
    /**
     * تقرير يومي لزبون معين: صفوف حسب المنصة + صف توتال لكل يوم.
     * معامل platform اختياري: tiktok | other (أخرى = واتساب، ماسنجر، فيسبوك، ويبسايت)
     */
    public function dailyReport(Request $request): JsonResponse
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'platform' => 'nullable|string|in:tiktok,other',
        ]);

        $client = Client::findOrFail($request->client_id);
        $from = $request->from;
        $to = $request->to;
        $platformFilter = $request->platform;

        $query = DailyReport::where('client_id', $client->id)
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to);

        if ($platformFilter === 'tiktok') {
            $query->where('platform', 'tiktok');
        } elseif ($platformFilter === 'other') {
            $query->whereIn('platform', ['whatsapp', 'messenger', 'facebook', 'website']);
        }

        $reports = $query->orderBy('date')->orderBy('platform')->get();

        $platformsOrder = $platformFilter === 'tiktok' ? ['tiktok'] : ($platformFilter === 'other' ? ['whatsapp', 'messenger', 'facebook', 'website'] : ['tiktok', 'whatsapp', 'messenger', 'facebook', 'website']);
        $byDate = $reports->groupBy(fn ($r) => $r->date->format('Y-m-d'));
        $rows = [];

        foreach ($byDate as $dateStr => $dayReports) {
            foreach ($platformsOrder as $p) {
                $row = $dayReports->firstWhere(fn ($r) => $r->platform->value === $p);
                if ($row) {
                    $rows[] = $this->formatReportRow($dateStr, $row->platform->label(), $row);
                }
            }
            $totalLeads = $dayReports->sum('leads_count');
            $totalOrders = $dayReports->sum('orders_count');
            $totalSpend = $dayReports->sum('ad_spend');
            $totalOrderValue = $dayReports->sum('order_value');
            $rows[] = $this->formatTotalRow($dateStr, $totalLeads, $totalOrders, $totalSpend, $totalOrderValue);
        }

        return response()->json([
            'client' => ['id' => $client->id, 'business_name' => $client->business_name],
            'from' => $from,
            'to' => $to,
            'platform_filter' => $platformFilter,
            'rows' => $rows,
        ]);
    }

    private function formatReportRow(string $date, string $platformLabel, DailyReport $row): array
    {
        return [
            'date' => $date,
            'platform' => $platformLabel,
            'is_total' => false,
            'leads_count' => (int) $row->leads_count,
            'orders_count' => (int) $row->orders_count,
            'ad_spend' => round((float) $row->ad_spend, 2),
            'order_value' => round((float) $row->order_value, 2),
            'cost_per_lead' => $row->cost_per_lead,
            'conversion_rate' => $row->conversion_rate,
            'cac' => $row->cac,
            'profit_after_spend' => $row->profit_after_spend,
            'roas' => $row->roas,
        ];
    }

    private function formatTotalRow(string $date, int $leads, int $orders, float $spend, float $orderValue): array
    {
        $costPerLead = $leads > 0 ? round($spend / $leads, 2) : 0.0;
        $conversionRate = $leads > 0 ? round($orders / $leads * 100, 2) : 0.0;
        $cac = $orders > 0 ? round($spend / $orders, 2) : 0.0;
        $profitAfterSpend = round($orderValue - $spend, 2);
        $roas = $spend > 0 ? round($orderValue / $spend, 2) : 0.0;

        return [
            'date' => $date,
            'platform' => 'توتال المنصات',
            'is_total' => true,
            'leads_count' => $leads,
            'orders_count' => $orders,
            'ad_spend' => round($spend, 2),
            'order_value' => round($orderValue, 2),
            'cost_per_lead' => $costPerLead,
            'conversion_rate' => $conversionRate,
            'cac' => $cac,
            'profit_after_spend' => $profitAfterSpend,
            'roas' => $roas,
        ];
    }

    /**
     * تقرير ميتا للميديا باير: حملات شغالة + صرف ورسائل/زيارات حسب هدف الحملة.
     * GET /api/reports/meta?client_id=&from=&to=
     */
    public function metaReport(Request $request, MetaAdsService $metaAdsService): JsonResponse
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
        ]);

        $client = Client::findOrFail($request->client_id);
        $data = $metaAdsService->getCampaignsAndInsightsByObjective($client, $request->from, $request->to);

        return response()->json([
            'client' => ['id' => $client->id, 'business_name' => $client->business_name],
            'from' => $request->from,
            'to' => $request->to,
            'objectives' => $data['objectives'] ?? [],
            'campaigns' => $data['campaigns'] ?? [],
            'error' => $data['error'] ?? null,
        ]);
    }

    /**
     * تقرير موحد للميديا باير: يدمج بيانات ميتا الحية + مبيعات الزبون + ROAS في رد واحد.
     * GET /api/reports/unified?client_id=&from=&to=&platform=meta|tiktok
     */
    public function unifiedReport(Request $request, MetaAdsService $metaAdsService): JsonResponse
    {
        $request->validate([
            'client_id' => 'required|exists:clients,id',
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'platform' => 'required|string|in:meta,tiktok',
        ]);

        $client = Client::findOrFail($request->client_id);
        $from = $request->from;
        $to = $request->to;
        $platform = $request->platform;

        // مبيعات الزبون (order_value) للنطاق الزمني — لحساب ROAS
        $totalSales = 0.0;
        if ($platform === 'tiktok') {
            $totalSales = (float) DailyReport::where('client_id', $client->id)
                ->where('platform', 'tiktok')
                ->whereDate('date', '>=', $from)
                ->whereDate('date', '<=', $to)
                ->sum('order_value');
        } else {
            // ميتا: إجمالي مبيعات الزبون من كل المنصات (مقارنة مع إجمالي صرف ميتا)
            $totalSales = (float) DailyReport::where('client_id', $client->id)
                ->whereDate('date', '>=', $from)
                ->whereDate('date', '<=', $to)
                ->sum('order_value');
        }

        if ($platform === 'meta') {
            $metaData = $metaAdsService->getCampaignsAndInsightsByObjective($client, $from, $to);
            $totalMetaSpend = 0.0;
            if (empty($metaData['error'])) {
                $totalMetaSpend = ($metaData['objectives']['messages']['spend'] ?? 0) + ($metaData['objectives']['visits']['spend'] ?? 0);
            }
            $roas = $totalMetaSpend > 0 ? round($totalSales / $totalMetaSpend, 2) : 0.0;

            return response()->json([
                'platform' => 'meta',
                'client' => ['id' => $client->id, 'business_name' => $client->business_name],
                'from' => $from,
                'to' => $to,
                'objectives' => $metaData['objectives'] ?? [
                    'messages' => ['spend' => 0, 'leads' => 0, 'campaigns' => []],
                    'visits' => ['spend' => 0, 'link_clicks' => 0, 'campaigns' => []],
                ],
                'total_meta_spend' => round($totalMetaSpend, 2),
                'sales' => [
                    'total_order_value' => round($totalSales, 2),
                ],
                'roas' => $roas,
                'error' => $metaData['error'] ?? null,
            ]);
        }

        // TikTok: من daily_reports فقط (لا API خارجي)
        $tiktokReports = DailyReport::where('client_id', $client->id)
            ->where('platform', 'tiktok')
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->orderBy('date')
            ->get();

        $totalTiktokSpend = (float) $tiktokReports->sum('ad_spend');
        $totalTiktokSales = (float) $tiktokReports->sum('order_value');
        $roasTiktok = $totalTiktokSpend > 0 ? round($totalTiktokSales / $totalTiktokSpend, 2) : 0.0;

        $dailyRows = $tiktokReports->map(fn ($r) => [
            'date' => $r->date->format('Y-m-d'),
            'ad_spend' => round((float) $r->ad_spend, 2),
            'leads_count' => (int) $r->leads_count,
            'orders_count' => (int) $r->orders_count,
            'order_value' => round((float) $r->order_value, 2),
        ])->values()->all();

        return response()->json([
            'platform' => 'tiktok',
            'client' => ['id' => $client->id, 'business_name' => $client->business_name],
            'from' => $from,
            'to' => $to,
            'total_spend' => round($totalTiktokSpend, 2),
            'sales' => [
                'total_order_value' => round($totalTiktokSales, 2),
            ],
            'roas' => $roasTiktok,
            'daily_rows' => $dailyRows,
        ]);
    }
}
