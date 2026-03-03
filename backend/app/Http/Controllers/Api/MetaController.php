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
    private function resolveClient(Request $request): ?Client
    {
        $user = $request->user();
        if ($user->role === 'client') {
            return $user->client;
        }
        if ($user->canManageClients() && $request->has('client_id')) {
            return Client::find($request->input('client_id'));
        }
        return null;
    }

    /**
     * GET /api/meta/ad-accounts — قائمة الحسابات الإعلانية. للزبون: حسابه. للميديا باير: client_id مطلوب.
     */
    public function adAccounts(Request $request): JsonResponse
    {
        $client = $this->resolveClient($request);

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون (مرّر client_id للميديا باير).'], 403);
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
     * POST /api/meta/save-account — حفظ الحساب الإعلاني. للزبون: حسابه. للميديا باير: client_id مطلوب.
     */
    public function saveAccount(Request $request): JsonResponse
    {
        $client = $this->resolveClient($request);

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون (مرّر client_id للميديا باير).'], 403);
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
     * POST /api/meta/sync — سحب بيانات الصرف والرسائل ونقرات الرابط من ميتا. للزبون: حسابه. للميديا باير: client_id مطلوب.
     */
    public function sync(Request $request, MetaAdsService $metaAdsService): JsonResponse
    {
        $client = $this->resolveClient($request);

        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون (مرّر client_id للميديا باير).'], 403);
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
