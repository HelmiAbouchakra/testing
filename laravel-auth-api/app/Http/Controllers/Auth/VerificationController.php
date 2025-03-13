<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Validator;

class VerificationController extends Controller
{
    /**
     * Create a new controller instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('throttle:6,1')->only('verify', 'resend');
    }

    /**
     * Verify the user's email using a verification code.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verify(Request $request): JsonResponse
    {
        // Validate the request
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid verification code format.',
                'errors' => $validator->errors()
            ], 422);
        }

        // Get the authenticated user
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        // Check if the user is already verified
        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified.'
            ], 200);
        }

        // Check if the verification code is valid
        if (!$user->isValidVerificationCode($request->code)) {
            return response()->json([
                'message' => 'Invalid or expired verification code.'
            ], 422);
        }

        // Mark email as verified
        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
            
            // Clear the verification code
            $user->verification_code = null;
            $user->verification_code_expires_at = null;
            $user->save();
        }

        return response()->json([
            'message' => 'Email has been verified successfully.'
        ], 200);
    }

    /**
     * Resend the email verification notification with a code.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email already verified.'
            ], 200);
        }

        try {
            // Check if we've already sent an email recently
            $lastCodeSent = $user->verification_code_expires_at;
            
            // If a code was sent in the last minute, prevent duplicate sends
            if ($lastCodeSent && now()->diffInSeconds($lastCodeSent) < 60) {
                return response()->json([
                    'message' => 'Verification code was recently sent. Please wait before requesting a new one.',
                    'wait_time' => 60 - now()->diffInSeconds($lastCodeSent)
                ], 429);
            }
            
            // Generate a new verification code
            $code = $user->generateVerificationCode();
            
            // Send the verification code email
            $user->sendEmailVerificationNotification();
            
            // Log the email sending attempt
            \Log::info('Verification code generated for user: ' . $user->email . ' Code: ' . $code);
            
            return response()->json([
                'message' => 'Verification code sent!',
                'code' => $code // For testing purposes only, remove in production
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Failed to send verification email: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to send verification email. Please try again later.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send a verification email to a newly registered user without requiring authentication
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function sendForNewUser(Request $request): JsonResponse
    {
        // Validate the request
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid email address or user not found.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Find the user by email
            $user = User::where('email', $request->email)->first();
            
            if (!$user) {
                return response()->json([
                    'message' => 'User not found.'
                ], 404);
            }
            
            // If the email is already verified, no need to send another email
            if ($user->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'Email already verified.'
                ], 200);
            }
            
            // Check if we've already sent an email recently
            $lastCodeSent = $user->verification_code_expires_at;
            
            // If a code was sent in the last minute, prevent duplicate sends
            if ($lastCodeSent && now()->diffInSeconds($lastCodeSent) < 60) {
                // Instead of rejecting, return the existing code
                \Log::info('Returning existing verification code for user: ' . $user->email . ' Code: ' . $user->verification_code);
                
                return response()->json([
                    'message' => 'Using existing verification code.',
                    'code' => $user->verification_code // Return existing code
                ], 200);
            }
            
            // Generate a new verification code
            $code = $user->generateVerificationCode();
            
            // Send the verification code email
            $user->sendEmailVerificationNotification();
            
            // Log the email sending attempt
            \Log::info('Verification code generated for new user: ' . $user->email . ' Code: ' . $code);
            
            return response()->json([
                'message' => 'Verification code sent!',
                'code' => $code // For testing purposes only, remove in production
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Failed to send verification email to new user: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to send verification email. Please try again later.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify email for a newly registered user without requiring authentication
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function verifyNewUser(Request $request): JsonResponse
    {
        // Validate the request
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'code' => 'required|string|size:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Invalid verification code or email format.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Find the user by email
            $user = User::where('email', $request->email)->first();
            
            if (!$user) {
                return response()->json([
                    'message' => 'User not found.'
                ], 404);
            }
            
            // Check if the user is already verified
            if ($user->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'Email already verified.'
                ], 200);
            }
            
            \Log::info('Verifying email for user: ' . $user->email . ' with code: ' . $request->code);
            \Log::info('Stored code: ' . $user->verification_code . ', expires at: ' . ($user->verification_code_expires_at ?? 'null'));
            
            // Check if the verification code is valid
            if (!$user->isValidVerificationCode($request->code)) {
                \Log::warning('Invalid verification code for user: ' . $user->email . 
                    ', Code: ' . $request->code . 
                    ', Stored Code: ' . $user->verification_code . 
                    ', Expires At: ' . ($user->verification_code_expires_at ? $user->verification_code_expires_at->toDateTimeString() : 'null'));
                    
                // For debugging: Automatically send a new code
                $code = $user->generateVerificationCode();
                $user->sendEmailVerificationNotification();
                \Log::info('New verification code generated: ' . $code);
                
                return response()->json([
                    'message' => 'Invalid or expired verification code. A new code has been sent to your email.',
                    'debug_code' => $code // Remove in production
                ], 422);
            }
            
            // Mark email as verified
            if ($user->markEmailAsVerified()) {
                event(new Verified($user));
                
                // Clear the verification code
                $user->verification_code = null;
                $user->verification_code_expires_at = null;
                $user->save();
                
                \Log::info('Email verified successfully for user: ' . $user->email);
            }
            
            return response()->json([
                'message' => 'Email has been verified successfully.'
            ], 200);
        } catch (\Exception $e) {
            \Log::error('Failed to verify email for new user: ' . $e->getMessage());
            
            return response()->json([
                'message' => 'Failed to verify email. Please try again later.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
