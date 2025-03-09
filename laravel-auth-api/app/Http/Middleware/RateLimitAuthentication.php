<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter as FacadesRateLimiter;
use Symfony\Component\HttpFoundation\Response;

class RateLimitAuthentication
{
    /**
     * The rate limiter instance.
     *
     * @var \Illuminate\Cache\RateLimiter
     */
    protected $limiter;

    /**
     * Create a new rate limit authentication middleware instance.
     *
     * @param  \Illuminate\Cache\RateLimiter  $limiter
     * @return void
     */
    public function __construct(RateLimiter $limiter)
    {
        $this->limiter = $limiter;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Create a throttle key combining the client IP and the route name
        $key = 'auth_' . $request->ip();
        
        // For login endpoints, also include the email to prevent brute forcing of specific accounts
        if ($request->is('api/v1/auth/login') && $request->has('email')) {
            $key .= '_' . $request->input('email');
        }

        // Allow 5 attempts, then throttle for 15 minutes (900 seconds)
        if (FacadesRateLimiter::tooManyAttempts($key, 5)) {
            $seconds = FacadesRateLimiter::availableIn($key);
            
            return response()->json([
                'message' => 'Too many authentication attempts. Please try again after ' . 
                    ceil($seconds / 60) . ' minutes.',
                'retry_after' => $seconds,
            ], 429);
        }

        // Increment the counter for this key
        FacadesRateLimiter::hit($key, 900);

        $response = $next($request);

        // If authentication successful, clear the rate limit
        if ($request->is('api/v1/auth/login') && $response->getStatusCode() === 200) {
            FacadesRateLimiter::clear($key);
        }

        return $response;
    }
}
