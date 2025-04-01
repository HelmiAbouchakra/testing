<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\VerificationController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\MfaController;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\Auth\CsrfController;
use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Admin\AdminController;

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
    Route::get('csrf-token', [CsrfController::class, 'getCsrfToken']);
    
    // Authentication routes
    Route::prefix('auth')->group(function () {
        // Apply rate limiting to login and registration
        Route::middleware(['rate_limit_auth'])->group(function () {
            Route::post('login', [AuthController::class, 'login']);
            Route::post('register', [AuthController::class, 'register']);
            Route::post('check-email', [AuthController::class, 'checkEmailExists']);
            Route::post('validate-email', [AuthController::class, 'validateEmail']);
            Route::post('forgot-password', [PasswordResetController::class, 'forgotPassword']);
            Route::post('reset-password', [PasswordResetController::class, 'resetPassword']);
        });
        
        Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
        Route::get('user', [AuthController::class, 'user'])->middleware('auth:sanctum');
        Route::get('check-role', [AuthController::class, 'checkRole'])->middleware('auth:sanctum');
        Route::post('email/verification-notification', [VerificationController::class, 'resend'])
            ->middleware(['auth:sanctum', 'throttle:6,1']);
        Route::post('email/verify', [VerificationController::class, 'verify'])
            ->middleware(['auth:sanctum', 'throttle:6,1']);
        
        // Special route for newly registered users that doesn't require authentication
        Route::post('send-verification-email', [VerificationController::class, 'sendForNewUser'])
            ->middleware('throttle:6,1');
            
        // Special route for verifying emails for newly registered users without authentication
        Route::post('verify-new-user-email', [VerificationController::class, 'verifyNewUser'])
            ->middleware('throttle:6,1');
            
        // Keep the old route for backward compatibility (if needed)
        Route::get('email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
            ->name('verification.verify');
        
        // Social login routes
        Route::get('google/redirect', [SocialAuthController::class, 'redirectToGoogle']);
        Route::get('google/callback', [SocialAuthController::class, 'handleGoogleCallback']);
        Route::get('facebook/redirect', [SocialAuthController::class, 'redirectToFacebook']);
        Route::get('facebook/callback', [SocialAuthController::class, 'handleFacebookCallback']);
    });
    
    // MFA routes
    Route::middleware('auth:sanctum')->prefix('mfa')->group(function () {
        Route::get('/status', [MfaController::class, 'status']);
        Route::post('/setup', [MfaController::class, 'setup']);
        Route::post('/enable', [MfaController::class, 'enable']);
        Route::post('/disable', [MfaController::class, 'disable']);
        Route::post('/verify', [MfaController::class, 'verify']);
        Route::post('/recovery-codes', [MfaController::class, 'regenerateRecoveryCodes']);
    });
});

// Routes outside the v1 prefix to catch Facebook's callback
Route::get('/auth/facebook/callback', [SocialAuthController::class, 'handleFacebookCallback']);
Route::get('/auth/google/callback', [SocialAuthController::class, 'handleGoogleCallback']);

// Standard protected routes (don't require MFA)
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    // User profile routes
    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'show']);
        Route::put('/', [ProfileController::class, 'update']);
        Route::put('/password', [ProfileController::class, 'updatePassword']);
        Route::delete('/', [ProfileController::class, 'destroy']);
    });
    
    // Other authenticated API endpoints can be added here
});

// Protected routes that require MFA
Route::middleware(['auth:sanctum', 'require_mfa'])->prefix('v1/secure')->group(function () {
    // Routes that require MFA can be placed here
    // For example:
    // Route::get('/sensitive-data', 'SensitiveDataController@index');
});

// Admin routes - only accessible to admin users
Route::middleware(['auth:sanctum', 'admin'])->prefix('v1/admin')->group(function () {
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::post('/users/admin', [AdminController::class, 'createAdmin']);
    Route::put('/users/{id}/role', [AdminController::class, 'updateRole']);
    Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
});