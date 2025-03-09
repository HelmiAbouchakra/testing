<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as BaseVerifier;

class VerifyCsrfToken extends BaseVerifier
{
    /**
     * The URIs that should be excluded from CSRF verification.
     *
     * @var array<int, string>
     */
    protected $except = [
        // Exclude social login callbacks from CSRF verification
        'api/v1/auth/google/callback',
        'api/v1/auth/facebook/callback',
    ];

    /**
     * Handle an incoming request.
     *
     * @param  mixed  $request  The request instance
     * @param  \Closure  $next  The next middleware
     * @return mixed
     */
    public function handle($request, Closure $next)
    {
        // For API requests that are state-changing (POST, PUT, DELETE, PATCH)
        if ($request instanceof Request && $request->is('api/*') && in_array($request->method(), ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            if ($this->isReading($request) || $this->inExceptArray($request) || $this->tokensMatch($request)) {
                return $next($request);
            }
            
            throw new \Illuminate\Session\TokenMismatchException('CSRF token mismatch.');
        }
        
        return parent::handle($request, $next);
    }
    
    /**
     * Determine if the request has a URI that should pass through CSRF verification.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return bool
     */
    protected function inExceptArray($request)
    {
        foreach ($this->except as $except) {
            if ($request->is($except)) {
                return true;
            }
        }

        return false;
    }
}