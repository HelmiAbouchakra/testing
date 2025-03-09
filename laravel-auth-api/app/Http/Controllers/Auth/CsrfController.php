<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;

class CsrfController extends Controller
{
    /**
     * Get a CSRF token cookie
     *
     * @param Request $request
     * @return \Illuminate\Http\Response
     */
    public function getCsrfToken(Request $request)
    {
        // Regenerate the CSRF token
        $request->session()->regenerateToken();
        
        // Return an empty response - the CSRF cookie will be attached automatically
        return response()->json(['message' => 'CSRF cookie set']);
    }
}
