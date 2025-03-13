<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Contracts\Factory;
use Laravel\Socialite\SocialiteManager;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(Authenticator::class, function ($app) {
            return new Authenticator($app);
        });

        // Add this for social auth to work properly with Angular frontend
        $this->app->singleton(Factory::class, function ($app) {
            return new SocialiteManager($app);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Handle CORS better for social authentication
        if ($this->app->environment('local')) {
            \URL::forceScheme('http');
        } else {
            \URL::forceScheme('https');
        }
        
        // Ensure consistent verification codes - part of the email verification fix
        if (!$this->app->runningInConsole()) {
            \Illuminate\Support\Facades\Config::set('auth.verification.expire', 1440); // 24 hours
        }
    }
}
