<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Services\MetaAdsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * إدارة حسابات ميتا الإعلانية للزبون: جلب القائمة وحفظ الاختيار.
 */
class MetaController extends Controller
{
    /**
     * GET /api/meta/ad-accounts — قائمة الحسابات الإعلانية المرتبطة بحساب الزبون.
     */
    public function adAccounts(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط.'], 403);
        }

        if ($user->role !== 'client') {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        if (! $client->meta_connected || ! $client->long_lived_token) {
            return response()->json(['message' => 'يرجى ربط حساب ميتا أولاً.'], 400);
        }

        $url = 'https://graph.facebook.com/v18.0/me/adaccounts?' . http_build_query([
            'fields' => 'id,name,account_id',
            'access_token' => $client->long_lived_token,
        ]);

        $response = Http::get($url);
        if (! $response->successful()) {
            return response()->json([
                'message' => 'فشل جلب الحسابات الإعلانية من ميتا.',
                'error' => $response->json(),
            ], 502);
        }

        $data = $response->json();
        $accounts = $data['data'] ?? [];

        return response()->json([
            'data' => array_map(function ($a) {
                return [
                    'id' => $a['id'] ?? null,
                    'account_id' => $a['account_id'] ?? null,
                    'name' => $a['name'] ?? '',
                ];
            }, $accounts),
        ]);
    }

    /**
     * POST /api/meta/save-account — حفظ الحساب الإعلاني المختار (fb_ad_account_id).
     * الاستجابة فورية؛ سحب البيانات يتم لاحقاً عبر POST /api/meta/sync (من لوحة التحليلات أو بعد الحفظ من الواجهة).
     */
    public function saveAccount(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط.'], 403);
        }

        if ($user->role !== 'client') {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $request->validate([
            'ad_account_id' => 'required|string|max:100',
        ]);

        $client->update(['fb_ad_account_id' => $request->ad_account_id]);

        return response()->json([
            'message' => 'تم حفظ الحساب الإعلاني. جاري سحب البيانات من ميتا…',
            'fb_ad_account_id' => $client->fb_ad_account_id,
        ]);
    }

    /**
     * POST /api/meta/sync — سحب بيانات الصرف وعدد الرسائل من ميتا لنطاق تواريخ وحفظها في التقارير اليومية.
     * للزبون المرتبط بميتا فقط. يُستخدم لعرض بيانات الحملات في لوحة التاجر ولوحة الميديا باير.
     */
    public function sync(Request $request, MetaAdsService $metaAdsService): JsonResponse
    {
        $user = $request->user();
        $client = $user->client;

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط.'], 403);
        }

        if ($user->role !== 'client') {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        if (! $client->meta_connected || ! $client->long_lived_token || ! $client->fb_ad_account_id) {
            return response()->json(['message' => 'يرجى ربط حساب ميتا واختيار الحساب الإعلاني أولاً.'], 400);
        }

        $to = $request->input('to', now()->format('Y-m-d'));
        $days = (int) $request->input('days', 30);
        $days = max(1, min(90, $days));
        $from = $request->input('from', now()->subDays($days)->format('Y-m-d'));

        $result = $metaAdsService->syncClientDateRange($client, $from, $to);

        return response()->json([
            'message' => 'تم سحب بيانات الحملات من ميتا.',
            'synced_days' => $result['synced_days'],
            'from' => $from,
            'to' => $to,
            'errors' => $result['errors'],
        ]);
    }
}
