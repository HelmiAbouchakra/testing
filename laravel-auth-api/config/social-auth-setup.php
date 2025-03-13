<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Social Authentication Settings
    |--------------------------------------------------------------------------
    |
    | This file contains configuration settings for social authentication
    | that will be used by the SocialAuthController.
    |
    */

    // Google OAuth Settings
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => 'http://localhost:8000/api/auth/google/callback',
    ],

    // Facebook OAuth Settings
    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => 'http://localhost:8000/api/auth/facebook/callback',
    ],
];
