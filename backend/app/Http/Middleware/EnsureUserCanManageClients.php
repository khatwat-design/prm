<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserCanManageClients
{
    /**
     * السماح فقط للأدمن والميديا باير بعرض وإدارة الزبائن.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->canManageClients()) {
            return response()->json(['message' => 'غير مصرح لك بهذا الإجراء.'], 403);
        }

        return $next($request);
    }
}
