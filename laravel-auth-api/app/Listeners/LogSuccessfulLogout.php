<?php

namespace App\Listeners;

use App\Models\AuthenticationLog;
use Carbon\Carbon;
use Illuminate\Auth\Events\Logout;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class LogSuccessfulLogout
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
    public function handle(Logout $event): void
    {
        $user = $event->user;
        
        // Skip if no authenticated user (rare edge case)
        if (!$user) {
            return;
        }
        
        // Get the user's latest successful login log
        $latestLog = $user->authenticationLogs()
            ->where('login_successful', true)
            ->whereNull('logout_at')
            ->latest('login_at')
            ->first();
            
        // Update the existing log with logout time
        if ($latestLog) {
            $latestLog->update([
                'logout_at' => Carbon::now(),
            ]);
        }
    }
}
