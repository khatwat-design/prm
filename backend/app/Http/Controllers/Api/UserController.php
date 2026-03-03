<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * إدارة المستخدمين — للأدمن فقط.
 */
class UserController extends Controller
{
    /**
     * قائمة المستخدمين مع ربط العميل إن وُجد.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with('client:id,user_id,business_name,meta_connected')
            ->when($request->query('search'), function ($q) use ($request) {
                $s = $request->query('search');
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('username', 'like', "%{$s}%");
            })
            ->when($request->query('role'), fn ($q, $role) => $q->where('role', $role))
            ->orderBy('name');

        $users = $query->paginate($request->integer('per_page', 20));

        return response()->json($users);
    }

    /**
     * إنشاء مستخدم (أدمن، ميديا باير، أو عميل مع ربط عميل إن وُجد).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'username' => 'nullable|string|max:64|unique:users,username',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:admin,mediabuyer,client',
            'client_id' => 'nullable|exists:clients,id', // لربط مستخدم عميل بحساب عميل موجود
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'username' => $validated['username'] ?? null,
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'is_active' => true,
        ]);

        if ($validated['role'] === 'client' && ! empty($validated['client_id'])) {
            Client::where('id', $validated['client_id'])->update(['user_id' => $user->id]);
        } elseif ($validated['role'] === 'client' && empty($validated['client_id'])) {
            Client::create([
                'user_id' => $user->id,
                'business_name' => $validated['name'],
                'meta_connected' => false,
            ]);
        }

        $user->load('client:id,user_id,business_name,meta_connected');

        return response()->json($user, 201);
    }

    /**
     * تحديث مستخدم (الاسم، الإيميل، اليوزرنيم، الدور، التعطيل).
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,'.$user->id,
            'username' => 'nullable|string|max:64|unique:users,username,'.$user->id,
            'password' => 'nullable|string|min:8',
            'role' => 'sometimes|string|in:admin,mediabuyer,client',
            'is_active' => 'sometimes|boolean',
        ]);

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        $user->load('client:id,user_id,business_name,meta_connected');

        return response()->json($user);
    }
}
