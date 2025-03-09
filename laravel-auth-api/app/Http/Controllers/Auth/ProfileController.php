<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;

class ProfileController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Get the authenticated user's profile.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'user' => $user,
            'email_verified' => $user->hasVerifiedEmail(),
            'social_auth' => !empty($user->provider),
        ]);
    }

    /**
     * Update the authenticated user's profile.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => [
                'sometimes', 
                'string', 
                'email', 
                'max:255', 
                Rule::unique('users')->ignore($user->id),
            ],
        ]);

        // Check if email is being changed
        $emailChanged = $request->has('email') && $request->email !== $user->email;
        
        // Update user data
        if ($request->has('name')) {
            $user->name = $request->name;
        }
        
        if ($emailChanged) {
            $user->email = $request->email;
            $user->email_verified_at = null;
        }
        
        $user->save();
        
        // Send verification email if email changed
        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
            return response()->json([
                'message' => 'Profile updated successfully. Please verify your new email address.',
                'user' => $user,
            ]);
        }
        
        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user,
        ]);
    }

    /**
     * Update the authenticated user's password.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Skip current password validation for social auth users without a password
        if (!empty($user->provider)) {
            $request->validate([
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ]);
        } else {
            $request->validate([
                'current_password' => ['required', 'current_password'],
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ]);
        }
        
        $user->password = Hash::make($request->password);
        $user->save();
        
        return response()->json([
            'message' => 'Password updated successfully.'
        ]);
    }

    /**
     * Delete the authenticated user's account.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Validate user confirmation
        $request->validate([
            'password' => ['required', function ($attribute, $value, $fail) use ($user) {
                // Skip password validation for social auth users without a password
                if (empty($user->provider) && !Hash::check($value, $user->password)) {
                    $fail('The provided password is incorrect.');
                }
            }],
        ]);
        
        // Revoke all tokens
        $user->tokens()->delete();
        
        // Delete the user
        $user->delete();
        
        return response()->json([
            'message' => 'Account deleted successfully.'
        ]);
    }
}
