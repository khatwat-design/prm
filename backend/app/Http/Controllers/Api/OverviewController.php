<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\DailyReport;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * نظرة شاملة على النظام — للأدمن (أو الميديا باير مع فلترة عميل).
 */
class OverviewController extends Controller
{
    /**
     * إحصائيات: إجمالي مبيعات، صرف، عدد العملاء، عدد المستخدمين. مع فلترة من-إلى وعميل اختياري.
     */
    public function stats(Request $request): JsonResponse
    {
        $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
            'client_id' => 'nullable|exists:clients,id',
        ]);

        $query = DailyReport::query();
        if ($request->from) {
            $query->whereDate('date', '>=', $request->from);
        }
        if ($request->to) {
            $query->whereDate('date', '<=', $request->to);
        }
        if ($request->client_id) {
            $query->where('client_id', $request->client_id);
        }

        $totalOrderValue = (float) $query->clone()->sum('order_value');
        $totalAdSpend = (float) $query->clone()->sum('ad_spend');
        $clientsCount = Client::count();
        $usersCount = User::where('is_active', true)->count();

        if ($request->client_id) {
            $clientsCount = 1;
        }

        return response()->json([
            'total_order_value' => round($totalOrderValue, 2),
            'total_ad_spend' => round($totalAdSpend, 2),
            'clients_count' => $clientsCount,
            'users_count' => $usersCount,
            'from' => $request->from,
            'to' => $request->to,
            'client_id' => $request->client_id,
        ]);
    }
}
