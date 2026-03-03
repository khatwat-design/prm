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
     * تسجيل الدخول بإيميل أو يوزرنيم + كلمة المرور
     * الحقل "email" في الطلب يقبل إيميل أو يوزرنيم للتوافق مع الواجهة
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string', // يقبل إيميل أو يوزرنيم
            'password' => 'required',
        ]);

        $login = $request->input('email');
        $user = User::where('email', $login)
            ->orWhere('username', $login)
            ->first();

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
                'username' => $user->username,
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
                'username' => $user->username,
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
     * تحديث الملف الشخصي (الاسم، اليوزرنيم)
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'username' => 'nullable|string|max:64|unique:users,username,'.$user->id,
        ]);

        $user->update($validated);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'username' => $user->username,
                'role' => $user->role,
            ],
        ]);
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
