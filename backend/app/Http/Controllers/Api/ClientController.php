<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ClientController extends Controller
{
    /**
     * قائمة الزبائن — للميديا باير والأدمن فقط
     */
    public function index(Request $request): JsonResponse
    {
        $clients = Client::with('user:id,name,email,role')
            ->withCount('dailyReports')
            ->when($request->query('search'), function ($q) use ($request) {
                $search = $request->query('search');
                $q->where('business_name', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($uq) => $uq->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            })
            ->orderBy('business_name')
            ->paginate($request->integer('per_page', 15));

        return response()->json($clients);
    }

    /**
     * إضافة زبون جديد — إنشاء مستخدم + سجل زبون (للميديا باير والأدمن فقط)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'business_name' => 'required|string|max:255',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_CLIENT,
        ]);

        $client = Client::create([
            'user_id' => $user->id,
            'business_name' => $validated['business_name'],
            'meta_connected' => false,
        ]);

        $client->load('user:id,name,email,role');

        return response()->json($client, 201);
    }
}
