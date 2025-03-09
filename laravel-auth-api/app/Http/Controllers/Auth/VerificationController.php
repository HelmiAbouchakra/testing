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
}
