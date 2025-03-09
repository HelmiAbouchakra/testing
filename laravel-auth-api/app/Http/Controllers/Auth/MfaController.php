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
        
        // Verify current password before allowing MFA setup
        $request->validate([
            'password' => ['required', function ($attribute, $value, $fail) use ($user) {
                if (!Hash::check($value, $user->password)) {
                    $fail('The provided password is incorrect.');
                }
            }],
        ]);
        
        // Generate new secret
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();
        
        // Save to user
        $user->mfa_secret = $secret;
        $user->mfa_enabled = false;
        $user->mfa_confirmed_at = null;
        $user->save();
        
        // Generate QR code
        $qrCodeUrl = $google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );
        
        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );
        
        $writer = new Writer($renderer);
        $qrCodeSvg = $writer->writeString($qrCodeUrl);
        
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
        
        $google2fa = new Google2FA();
        
        if (!$google2fa->verifyKey($user->mfa_secret, $request->code)) {
            throw ValidationException::withMessages([
                'code' => ['The provided code is invalid.'],
            ]);
        }
        
        $user->mfa_enabled = true;
        $user->mfa_confirmed_at = now();
        $user->save();
        
        return response()->json([
            'message' => 'Two-factor authentication has been enabled.',
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
        
        $authenticator = app(Authenticator::class);
        
        if ($authenticator->verifyGoogle2FA($request->code)) {
            $authenticator->login();
            
            // Create a new session
            $request->session()->regenerate();
            
            return response()->json([
                'message' => 'Two-factor authentication successful.',
                'user' => $request->user()
            ]);
        }
        
        // Check if using a recovery code
        $user = $request->user();
        $recoveryCodes = $user->mfa_recovery_codes ?? [];
        
        if (in_array($request->code, $recoveryCodes)) {
            // Remove the used recovery code
            $recoveryCodes = array_filter($recoveryCodes, function ($code) use ($request) {
                return $code !== $request->code;
            });
            
            $user->mfa_recovery_codes = $recoveryCodes;
            $user->save();
            
            // Create a new session
            $request->session()->regenerate();
            
            return response()->json([
                'message' => 'Two-factor authentication successful using recovery code.',
                'user' => $user,
                'recovery_codes_remaining' => count($recoveryCodes)
            ]);
        }
        
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