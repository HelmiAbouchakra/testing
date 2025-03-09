<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     *
     * @return \Illuminate\Http\Response
     */
    public function redirectToGoogle()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Handle the callback from Google authentication.
     *
     * @return \Illuminate\Http\Response
     */
    public function handleGoogleCallback(Request $request)
    {
        try {
            $socialiteUser = Socialite::driver('google')->stateless()->user();
            
            // Find user by provider ID and provider name or by email
            $user = User::where('provider_id', $socialiteUser->getId())
                        ->where('provider', 'google')
                        ->first();
                        
            if (!$user) {
                // Check if a user with this email already exists
                $user = User::where('email', $socialiteUser->getEmail())->first();
                
                if (!$user) {
                    // Create a new user if none exists
                    $user = User::create([
                        'name' => $socialiteUser->getName(),
                        'email' => $socialiteUser->getEmail(),
                        'email_verified_at' => now(), // Email is verified from Google
                        'password' => Hash::make(Str::random(16)),
                        'provider' => 'google',
                        'provider_id' => $socialiteUser->getId(),
                        'provider_token' => $socialiteUser->token,
                        'provider_refresh_token' => $socialiteUser->refreshToken,
                    ]);
                } else {
                    // Link existing user account with Google
                    $user->provider = 'google';
                    $user->provider_id = $socialiteUser->getId();
                    $user->provider_token = $socialiteUser->token;
                    $user->provider_refresh_token = $socialiteUser->refreshToken;
                    $user->save();
                }
            }
            
            // Log in the user
            Auth::login($user);
            $request->session()->regenerate();
            
            // Redirect to frontend
            return redirect(config('app.spa_url') . '/auth/social-callback?provider=google&status=success');
            
        } catch (Exception $e) {
            // Redirect to frontend with error
            return redirect(config('app.spa_url') . '/auth/social-callback?provider=google&status=error&message=' . urlencode($e->getMessage()));
        }
    }

    /**
     * Redirect the user to the Facebook authentication page.
     *
     * @return \Illuminate\Http\Response
     */
    public function redirectToFacebook()
    {
        return Socialite::driver('facebook')->stateless()->redirect();
    }

    /**
     * Handle the callback from Facebook authentication.
     *
     * @return \Illuminate\Http\Response
     */
    public function handleFacebookCallback(Request $request)
    {
        try {
            $socialiteUser = Socialite::driver('facebook')->stateless()->user();
            
            // Find user by provider ID and provider name or by email
            $user = User::where('provider_id', $socialiteUser->getId())
                        ->where('provider', 'facebook')
                        ->first();
                        
            if (!$user) {
                // Check if a user with this email already exists
                $user = User::where('email', $socialiteUser->getEmail())->first();
                
                if (!$user) {
                    // Create a new user if none exists
                    $user = User::create([
                        'name' => $socialiteUser->getName(),
                        'email' => $socialiteUser->getEmail(),
                        'email_verified_at' => now(), // Email is verified from Facebook
                        'password' => Hash::make(Str::random(16)),
                        'provider' => 'facebook',
                        'provider_id' => $socialiteUser->getId(),
                        'provider_token' => $socialiteUser->token,
                        'provider_refresh_token' => $socialiteUser->refreshToken,
                    ]);
                } else {
                    // Link existing user account with Facebook
                    $user->provider = 'facebook';
                    $user->provider_id = $socialiteUser->getId();
                    $user->provider_token = $socialiteUser->token;
                    $user->provider_refresh_token = $socialiteUser->refreshToken;
                    $user->save();
                }
            }
            
            // Log in the user
            Auth::login($user);
            $request->session()->regenerate();
            
            // Redirect to frontend
            return redirect(config('app.spa_url') . '/auth/social-callback?provider=facebook&status=success');
            
        } catch (Exception $e) {
            // Redirect to frontend with error
            return redirect(config('app.spa_url') . '/auth/social-callback?provider=facebook&status=error&message=' . urlencode($e->getMessage()));
        }
    }
}
