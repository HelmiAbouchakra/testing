<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Publicly accessible routes
Route::prefix('v1')->group(function () {
    // CSRF token route
    Route::get('csrf-token', 'Auth\CsrfController@getCsrfToken');
    
    // Authentication routes
    Route::prefix('auth')->group(function () {
        // Apply rate limiting to login and registration
        Route::middleware(['rate_limit_auth'])->group(function () {
            Route::post('login', 'Auth\AuthController@login');
            Route::post('register', 'Auth\AuthController@register');
            Route::post('forgot-password', 'Auth\PasswordResetController@forgotPassword');
            Route::post('reset-password', 'Auth\PasswordResetController@resetPassword');
        });
        
        Route::post('logout', 'Auth\AuthController@logout')->middleware('auth:sanctum');
        Route::get('user', 'Auth\AuthController@user')->middleware('auth:sanctum');
        Route::post('email/verification-notification', 'Auth\VerificationController@resend')
            ->middleware(['auth:sanctum', 'throttle:6,1']);
        Route::get('email/verify/{id}/{hash}', 'Auth\VerificationController@verify')
            ->name('verification.verify');
        
        // Social login routes
        Route::get('google/redirect', 'Auth\SocialAuthController@redirectToGoogle');
        Route::get('google/callback', 'Auth\SocialAuthController@handleGoogleCallback');
        Route::get('facebook/redirect', 'Auth\SocialAuthController@redirectToFacebook');
        Route::get('facebook/callback', 'Auth\SocialAuthController@handleFacebookCallback');
    });
    
    // MFA routes
    Route::middleware('auth:sanctum')->prefix('mfa')->group(function () {
        Route::get('/status', 'Auth\MfaController@status');
        Route::post('/setup', 'Auth\MfaController@setup');
        Route::post('/enable', 'Auth\MfaController@enable');
        Route::post('/disable', 'Auth\MfaController@disable');
        Route::post('/verify', 'Auth\MfaController@verify');
        Route::post('/recovery-codes', 'Auth\MfaController@regenerateRecoveryCodes');
    });
});

// Standard protected routes (don't require MFA)
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    // User profile routes
    Route::prefix('profile')->group(function () {
        Route::get('/', 'Auth\ProfileController@show');
        Route::put('/', 'Auth\ProfileController@update');
        Route::put('/password', 'Auth\ProfileController@updatePassword');
        Route::delete('/', 'Auth\ProfileController@destroy');
    });
    
    // Other authenticated API endpoints can be added here
});

// Protected routes that require MFA
Route::middleware(['auth:sanctum', 'require_mfa'])->prefix('v1/secure')->group(function () {
    // Routes that require MFA can be placed here
    // For example:
    // Route::get('/sensitive-data', 'SensitiveDataController@index');
});