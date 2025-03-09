<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use PragmaRX\Google2FALaravel\Support\Authenticator;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class MfaController extends Controller
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
     * Check if MFA is enabled for the user.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'mfa_enabled' => $user->mfa_enabled,
            'mfa_confirmed' => !is_null($user->mfa_confirmed_at)
        ]);
    }

    /**
     * Generate MFA secret and QR code.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();
        
        \Log::info('MFA Setup starting', [
            'user_id' => $user->id, 
            'user_email' => $user->email
        ]);
        
        // Verify current password before allowing MFA setup
        $request->validate([
            'password' => ['required', function ($attribute, $value, $fail) use ($user) {
                if (!Hash::check($value, $user->password)) {
                    \Log::error('MFA Setup: Password validation failed', ['user_id' => $user->id]);
                    $fail('The provided password is incorrect.');
                }
            }],
        ]);
        
        // Generate new secret
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey(32);
        
        \Log::info('MFA Setup: Secret generated', [
            'user_id' => $user->id,
            'secret_length' => strlen($secret)
        ]);
        
        // Save to user
        $user->mfa_secret = $secret;
        $user->mfa_enabled = false;
        $user->mfa_confirmed_at = null;
        $user->save();
        
        // Generate QR code with proper otpauth format
        $qrCodeUrl = 'otpauth://totp/' . rawurlencode(config('app.name') . ':' . $user->email) . 
            '?secret=' . $secret . 
            '&issuer=' . rawurlencode(config('app.name')) . 
            '&algorithm=SHA1&digits=6&period=30';
        
        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );
        
        $writer = new Writer($renderer);
        $qrCodeSvg = $writer->writeString($qrCodeUrl);
        
        \Log::info('MFA Setup complete', [
            'user_id' => $user->id,
            'secret_generated' => !empty($secret),
            'qr_code_generated' => !empty($qrCodeSvg),
            'qr_code_size' => strlen($qrCodeSvg)
        ]);
        
        return response()->json([
            'secret' => $secret,
            'qr_code' => $qrCodeSvg,
            'recovery_codes' => $user->generateRecoveryCodes(),
        ]);
    }

    /**
     * Verify and enable MFA.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $request->validate([
            'code' => 'required|string|size:6',
        ]);
        
        \Log::info('MFA Enable: Verifying code', [
            'user_id' => $user->id,
            'has_secret' => !empty($user->mfa_secret),
            'secret_length' => strlen($user->mfa_secret),
            'code_length' => strlen($request->code)
        ]);
        
        $google2fa = new Google2FA();
        
        if (!$google2fa->verifyKey($user->mfa_secret, $request->code)) {
            \Log::error('MFA Enable: Invalid verification code', [
                'user_id' => $user->id,
                'code_length' => strlen($request->code)
            ]);
            
            throw ValidationException::withMessages([
                'code' => ['The provided code is invalid.'],
            ]);
        }
        
        $user->mfa_enabled = true;
        $user->mfa_confirmed_at = now();
        $user->save();
        
        \Log::info('MFA Enable: Successfully enabled', [
            'user_id' => $user->id,
            'mfa_enabled' => $user->mfa_enabled,
            'mfa_confirmed_at' => $user->mfa_confirmed_at
        ]);
        
        // Generate new recovery codes to send back
        $recoveryCodes = $user->generateRecoveryCodes();
        
        return response()->json([
            'message' => 'Two-factor authentication has been enabled.',
            'recovery_codes' => $recoveryCodes
        ]);
    }

    /**
     * Disable MFA.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function disable(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Verify current password before allowing MFA disabling
        $request->validate([
            'password' => ['required', function ($attribute, $value, $fail) use ($user) {
                if (!Hash::check($value, $user->password)) {
                    $fail('The provided password is incorrect.');
                }
            }],
        ]);
        
        $user->mfa_enabled = false;
        $user->mfa_secret = null;
        $user->mfa_recovery_codes = null;
        $user->mfa_confirmed_at = null;
        $user->save();
        
        return response()->json([
            'message' => 'Two-factor authentication has been disabled.',
        ]);
    }

    /**
     * Verify MFA during login.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verify(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);
        
        $user = $request->user();
        
        // First check if user has MFA enabled and a secret
        if (!$user->mfa_enabled || empty($user->mfa_secret)) {
            \Log::error('MFA Verify: MFA not properly set up', [
                'user_id' => $user->id,
                'mfa_enabled' => $user->mfa_enabled,
                'has_secret' => !empty($user->mfa_secret)
            ]);
            
            throw ValidationException::withMessages([
                'code' => ['Two-factor authentication is not properly set up.'],
            ]);
        }
        
        // Direct verification using Google2FA
        $google2fa = new Google2FA();
        
        // Debug info
        \Log::info('Verifying MFA code', [
            'user_id' => $user->id,
            'has_secret' => !empty($user->mfa_secret),
            'secret_length' => strlen($user->mfa_secret),
            'code_length' => strlen($request->code),
        ]);
        
        // Directly verify the code against the user's secret
        if ($google2fa->verifyKey($user->mfa_secret, $request->code)) {
            // Success! Mark as verified in session
            session(['mfa_verified' => true]);
            
            \Log::info('MFA Verify: Successful verification', [
                'user_id' => $user->id
            ]);
            
            return response()->json([
                'message' => 'Two-factor authentication successful.',
                'user' => $user
            ]);
        }
        
        // Check if using a recovery code
        $recoveryCodes = $user->mfa_recovery_codes ?? [];
        
        if (in_array($request->code, $recoveryCodes)) {
            // Remove the used recovery code
            $recoveryCodes = array_filter($recoveryCodes, function ($code) use ($request) {
                return $code !== $request->code;
            });
            
            $user->mfa_recovery_codes = $recoveryCodes;
            $user->save();
            
            \Log::info('MFA Verify: Successful recovery code verification', [
                'user_id' => $user->id,
                'recovery_codes_remaining' => count($recoveryCodes)
            ]);
            
            // Mark as verified in session
            session(['mfa_verified' => true]);
            
            return response()->json([
                'message' => 'Two-factor authentication successful using recovery code.',
                'user' => $user,
                'recovery_codes_remaining' => count($recoveryCodes)
            ]);
        }
        
        \Log::error('MFA Verify: Invalid verification code', [
            'user_id' => $user->id,
            'code_length' => strlen($request->code)
        ]);
        
        throw ValidationException::withMessages([
            'code' => ['The provided code is invalid.'],
        ]);
    }

    /**
     * Regenerate recovery codes.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->mfa_enabled) {
            return response()->json([
                'message' => 'Two-factor authentication is not enabled.',
            ], 400);
        }
        
        return response()->json([
            'recovery_codes' => $user->generateRecoveryCodes(),
        ]);
    }
}