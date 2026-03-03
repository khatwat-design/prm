<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Socialite\Facades\Socialite;

/**
 * OAuth مع ميتا (فيسبوك): توجيه الزبون لطلب الصلاحيات، واستقبال الـ Token وحفظ Long-Lived Token.
 */
class MetaAuthController extends Controller
{
    /**
     * إرجاع رابط التوجيه إلى فيسبوك. الزبون يربط حسابه؛ الميديا باير/الأدمن يمرر client_id لربط ذلك العميل.
     */
    public function redirect(Request $request): JsonResponse
    {
        $user = $request->user();
        $client = null;

        if ($user->role === 'client') {
            $client = $user->client;
            if (! $client) {
                return response()->json(['message' => 'لا يوجد حساب زبون مرتبط.'], 403);
            }
        } else {
            if (! $user->canManageClients()) {
                return response()->json(['message' => 'غير مصرح.'], 403);
            }
            $request->validate(['client_id' => 'required|exists:clients,id']);
            $client = Client::findOrFail($request->input('client_id'));
        }

        $state = encrypt(json_encode([
            'client_id' => $client->id,
            'initiated_by_user_id' => $user->id,
        ]));

        $redirectUri = config('services.facebook.redirect');
        if (empty($redirectUri)) {
            return response()->json(['message' => 'META_REDIRECT_URI غير مضبوط في .env'], 500);
        }

        $url = Socialite::driver('facebook')
            ->redirectUrl($redirectUri)
            ->scopes(['ads_read', 'business_management', 'read_insights'])
            ->with(['state' => $state])
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /**
     * استقبال callback من فيسبوك بعد الموافقة: استبدال الكود بـ Token ثم Long-Lived Token وحفظه.
     * هذا المسار غير محمي بـ Sanctum (يُستدعى من فيسبوك).
     */
    public function callback(Request $request)
    {
        $request->validate([
            'code' => 'required_without:error|string',
            'state' => 'required|string',
        ]);

        $frontend = rtrim(config('services.facebook.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')), '/');
        if ($request->has('error')) {
            return redirect($frontend.'/dashboard/client/settings?meta=error&message='.urlencode($request->get('error_description', $request->get('error', 'unknown'))));
        }

        try {
            $payload = json_decode(decrypt($request->state), true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return redirect($frontend.'/dashboard/client/settings?meta=invalid_state');
        }

        $clientId = $payload['client_id'] ?? null;
        if (! $clientId) {
            return redirect($frontend.'/dashboard/client/settings?meta=invalid_state');
        }

        $client = Client::find($clientId);
        if (! $client) {
            return redirect($frontend.'/dashboard/client/settings?meta=no_client');
        }

        // stateless لأن التوجيه تم من الفرونت اند (لا جلسة) — والتحقق من state تم أعلاه
        $fbUser = Socialite::driver('facebook')->stateless()->user();
        $accessToken = $fbUser->token;

        $longLived = $this->exchangeForLongLivedToken($accessToken);
        if (! $longLived) {
            return redirect(config('services.facebook.frontend_url', env('FRONTEND_URL', 'http://localhost:3000')).'/dashboard/client/settings?meta=token_exchange_failed');
        }

        $client->update([
            'long_lived_token' => $longLived,
            'meta_connected' => true,
        ]);

        $returnPath = '/dashboard/client/settings?meta=connected';
        if (isset($payload['initiated_by_user_id'])) {
            $initiator = \App\Models\User::find($payload['initiated_by_user_id']);
            if ($initiator && $initiator->canManageClients()) {
                $returnPath = '/mediabuyer?meta=connected&client_id='.$client->id;
            }
        }
        return redirect($frontend.$returnPath);
    }

    private function exchangeForLongLivedToken(string $shortLivedToken): ?string
    {
        $clientId = config('services.facebook.client_id');
        $clientSecret = config('services.facebook.client_secret');
        $url = 'https://graph.facebook.com/v18.0/oauth/access_token?' . http_build_query([
            'grant_type' => 'fb_exchange_token',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'fb_exchange_token' => $shortLivedToken,
        ]);

        $response = Http::get($url);
        if (! $response->successful()) {
            return null;
        }
        $data = $response->json();
        return $data['access_token'] ?? null;
    }
}
