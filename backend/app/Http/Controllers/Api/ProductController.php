<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * قائمة منتجات الزبون
     */
    public function index(Request $request): JsonResponse
    {
        $client = $request->user()?->client;
        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط.'], 403);
        }

        $products = Product::where('client_id', $client->id)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($products);
    }

    /**
     * إضافة منتج
     */
    public function store(Request $request): JsonResponse
    {
        $client = $request->user()?->client;
        if (! $client) {
            return response()->json(['message' => 'لا يوجد حساب زبون مرتبط.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $maxOrder = Product::where('client_id', $client->id)->max('sort_order') ?? 0;
        $product = Product::create([
            'client_id' => $client->id,
            'name' => $validated['name'],
            'price' => $validated['price'],
            'sort_order' => $validated['sort_order'] ?? $maxOrder + 1,
        ]);

        return response()->json($product, 201);
    }

    /**
     * تحديث منتج (مملوك للزبون)
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        $client = $request->user()?->client;
        if (! $client || $product->client_id !== $client->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $product->update($validated);

        return response()->json($product->fresh());
    }

    /**
     * حذف منتج
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        $client = $request->user()?->client;
        if (! $client || $product->client_id !== $client->id) {
            return response()->json(['message' => 'غير مصرح.'], 403);
        }

        $product->delete();

        return response()->json(['message' => 'تم حذف المنتج.']);
    }
}
