<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Registered;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Log;

class SendVerificationCodeNotification implements ShouldQueue
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
    public function handle(Registered $event): void
    {
        Log::info('SendVerificationCodeNotification listener triggered for user: ' . $event->user->email . ' at ' . now()->toDateTimeString());
        
        if ($event->user instanceof \Illuminate\Contracts\Auth\MustVerifyEmail &&
            ! $event->user->hasVerifiedEmail()) {
            
            try {
                // Generate a verification code and send the notification
                Log::info('About to send verification notification for: ' . $event->user->email);
                $event->user->sendEmailVerificationNotification();
                
                // Log success for debugging
                Log::info('Verification code sent to: ' . $event->user->email);
            } catch (\Exception $e) {
                // Log any errors that occur during the process
                Log::error('Failed to send verification code: ' . $e->getMessage());
            }
        }
    }
}
