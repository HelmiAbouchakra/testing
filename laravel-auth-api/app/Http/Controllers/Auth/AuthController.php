<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EmailValidationService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    protected $emailValidationService;

    public function __construct(EmailValidationService $emailValidationService)
    {
        $this->emailValidationService = $emailValidationService;
    }

    /**
     * Handle user login request
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $request->session()->regenerate();
        
        $user = Auth::user();
        
        // Check if MFA is enabled
        if ($user->mfa_enabled) {
            // Set session to indicate we passed first factor but need second factor
            session(['auth.mfa_required' => true]);
            
            return response()->json([
                'message' => 'First factor authentication successful',
                'requires_mfa' => true
            ]);
        }

        return response()->json([
            'message' => 'Login successful',
            'user' => $user
        ]);
    }

    /**
     * Handle user registration
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function register(Request $request)
    {
        try {
            \Log::info('Registration started for: ' . $request->email);
            
            $request->validate([
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ]);
    
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'status' => 'pending',
                'pending_until' => now()->addHours(24), // Give users 24 hours to verify email
            ]);
    
            \Log::info('User created with ID: ' . $user->id . ', email: ' . $user->email);
            
            // Generate a verification code first
            $code = $user->generateVerificationCode();
            \Log::info('Verification code generated: ' . $code . ' for user: ' . $user->email);
            
            // Then send the same code in the email
            $user->sendEmailVerificationNotification($code);
            \Log::info('Verification email sent with code: ' . $code);
            
            // Create a token and respond with it
            $token = $user->createToken('auth_token')->plainTextToken;
            
            \Log::info('Registration completed for: ' . $user->email);
    
            return response()->json([
                'access_token' => $token,
                'token_type' => 'Bearer',
                'message' => 'Registration successful! Please check your email for verification instructions.',
                'user' => $user,
                'verification_code' => $code // For debugging purposes only, remove in production
            ], 201);
            
        } catch (ValidationException $e) {
            \Log::error('Validation error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Registration error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Registration failed',
                'error' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * Handle user logout
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function logout(Request $request)
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get authenticated user information
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Validate an email globally using Abstract API
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function validateEmail(Request $request)
    {
        $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        $result = $this->emailValidationService->validateEmail($request->email);
        
        return response()->json([
            'email' => $request->email,
            'is_valid' => $result['valid'],
            'details' => $result
        ]);
    }
}
