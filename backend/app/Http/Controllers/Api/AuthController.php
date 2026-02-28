<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * تسجيل الدخول وإصدار توكن API
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    /**
     * بيانات المستخدم الحالي + الزبون إن وُجد (للواجهة — meta_connected، إلخ)
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $payload = [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ];
        $client = $user->client;
        if ($client) {
            $payload['client'] = [
                'id' => $client->id,
                'business_name' => $client->business_name,
                'meta_connected' => (bool) $client->meta_connected,
                'fb_ad_account_id' => $client->fb_ad_account_id,
            ];
        }
        return response()->json($payload);
    }

    /**
     * تسجيل الخروج — إلغاء التوكن الحالي من الخادم
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'تم تسجيل الخروج بنجاح']);
    }
}
