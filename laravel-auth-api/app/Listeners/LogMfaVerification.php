<?php

namespace App\Listeners;

use App\Models\AuthenticationLog;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use PragmaRX\Google2FALaravel\Events\LoginSucceeded;

class LogMfaVerification
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(LoginSucceeded $event): void
    {
        $user = auth()->user();
        $request = request();
        
        if ($user) {
            AuthenticationLog::create([
                'user_id' => $user->id,
                'email' => $user->email,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'login_type' => 'mfa_verification',
                'login_successful' => true,
                'login_at' => Carbon::now(),
                'device_name' => $request->header('User-Agent'),
                'browser' => $request->header('User-Agent'),
            ]);
            
            // Set session to indicate MFA is verified
            session(['mfa_verified' => true]);
        }
    }
}