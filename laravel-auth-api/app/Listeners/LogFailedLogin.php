<?php

namespace App\Listeners;

use App\Models\AuthenticationLog;
use Carbon\Carbon;
use Illuminate\Auth\Events\Failed;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Jenssegers\Agent\Agent;

class LogFailedLogin
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
    public function handle(Failed $event): void
    {
        $request = request();
        $agent = new Agent();
        $agent->setUserAgent($request->userAgent());
        
        // Get the email from the failed login attempt
        $email = $event->credentials['email'] ?? null;
        
        AuthenticationLog::create([
            'user_id' => $event->user?->id, // User ID will be null if user doesn't exist
            'email' => $email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'login_type' => 'traditional',
            'login_successful' => false,
            'login_at' => Carbon::now(),
            'device_name' => $agent->device(),
            'browser' => $agent->browser() . ' ' . $agent->version($agent->browser()),
            'failure_reason' => $this->getFailureReason($event),
        ]);
    }
    
    /**
     * Get a user-friendly description of the failure reason.
     */
    private function getFailureReason(Failed $event): string
    {
        if (is_null($event->user)) {
            return 'User does not exist';
        }
        
        return 'Invalid credentials';
    }
}
