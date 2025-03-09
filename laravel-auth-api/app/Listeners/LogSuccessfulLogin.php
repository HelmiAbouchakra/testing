<?php

namespace App\Listeners;

use App\Models\AuthenticationLog;
use Carbon\Carbon;
use Illuminate\Auth\Events\Login;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Jenssegers\Agent\Agent;

class LogSuccessfulLogin
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
    public function handle(Login $event): void
    {
        $user = $event->user;
        $request = request();
        $agent = new Agent();
        $agent->setUserAgent($request->userAgent());

        // Determine login type (default or social)
        $loginType = !empty($user->provider) ? $user->provider : 'traditional';

        AuthenticationLog::create([
            'user_id' => $user->id,
            'email' => $user->email,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'login_type' => $loginType,
            'login_successful' => true,
            'login_at' => Carbon::now(),
            'device_name' => $agent->device(),
            'browser' => $agent->browser() . ' ' . $agent->version($agent->browser()),
        ]);
    }
}
