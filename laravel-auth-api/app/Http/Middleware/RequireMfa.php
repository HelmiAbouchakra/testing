<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireMfa
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if ($user && $user->mfa_enabled && !session('mfa_verified')) {
            return response()->json([
                'message' => 'MFA verification required',
                'requires_mfa' => true
            ], 403);
        }
        
        return $next($request);
    }
}