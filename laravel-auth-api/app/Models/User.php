<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\VerifyEmailWithCode;

class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'provider',
        'provider_id',
        'provider_token',
        'provider_refresh_token',
        'avatar',
        'email_verified_at',
        'mfa_enabled',
        'mfa_secret',
        'mfa_recovery_codes',
        'mfa_confirmed_at',
        'verification_code',
        'verification_code_expires_at',
        'status',
        'pending_until',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'provider_token',
        'provider_refresh_token',
        'mfa_secret',
        'mfa_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'mfa_enabled' => 'boolean',
            'mfa_recovery_codes' => 'array',
            'mfa_confirmed_at' => 'datetime',
            'verification_code_expires_at' => 'datetime',
            'pending_until' => 'datetime',
        ];
    }

    /**
     * Get the authentication logs for the user.
     */
    public function authenticationLogs(): HasMany
    {
        return $this->hasMany(AuthenticationLog::class);
    }
    
    /**
     * Generate new recovery codes.
     *
     * @return array
     */
    public function generateRecoveryCodes(): array
    {
        $recoveryCodes = [];
        
        for ($i = 0; $i < 8; $i++) {
            $recoveryCodes[] = sprintf(
                '%s-%s-%s-%s',
                substr(bin2hex(random_bytes(3)), 0, 4),
                substr(bin2hex(random_bytes(3)), 0, 4),
                substr(bin2hex(random_bytes(3)), 0, 4),
                substr(bin2hex(random_bytes(3)), 0, 4)
            );
        }
        
        $this->mfa_recovery_codes = $recoveryCodes;
        $this->save();
        
        return $recoveryCodes;
    }

    /**
     * Generate a 6-digit verification code.
     *
     * @return string
     */
    public function generateVerificationCode(): string
    {
        // Generate a random 6-digit code
        $code = sprintf('%06d', mt_rand(0, 999999));
        
        // Store the code and set expiration time (24 hours from now instead of 1 hour)
        $this->verification_code = $code;
        $this->verification_code_expires_at = now()->addHours(24);
        $this->save();
        
        \Log::info('Generated verification code for user: ' . $this->email . ', Code: ' . $code . ', Expires: ' . $this->verification_code_expires_at);
        
        return $code;
    }
    
    /**
     * Check if the verification code is valid.
     *
     * @param string $code
     * @return bool
     */
    public function isValidVerificationCode(string $code): bool
    {
        // Check if the code matches and hasn't expired
        return $this->verification_code === $code && 
               $this->verification_code_expires_at && 
               now()->lt($this->verification_code_expires_at);
    }

    /**
     * Mark email as verified and change status to active.
     *
     * @return bool
     */
    public function markEmailAsVerified()
    {
        $this->status = 'active';
        $this->pending_until = null;
        return $this->forceFill([
            'email_verified_at' => $this->freshTimestamp(),
        ])->save();
    }

    /**
     * Check if we already sent a verification email recently to prevent duplicates
     * 
     * @return boolean
     */
    public function recentlySentVerificationEmail(): bool
    {
        // Use a cache key that's unique to this user's email
        $cacheKey = 'verification_email_sent_' . $this->email;
        
        // If the key exists in the cache, we've sent an email recently
        if (\Cache::has($cacheKey)) {
            \Log::info('Prevented duplicate verification email to: ' . $this->email);
            return true;
        }
        
        // Otherwise, mark that we're sending an email now and cache it for 1 minute
        \Cache::put($cacheKey, true, now()->addMinute());
        return false;
    }

    /**
     * Send the email verification notification.
     *
     * @param string|null $code Optional verification code to send
     * @return void
     */
    public function sendEmailVerificationNotification($code = null)
    {
        // Make sure we have a valid verification code before sending
        if (empty($this->verification_code) || !$this->verification_code_expires_at || now()->gt($this->verification_code_expires_at)) {
            // Generate a new code if needed
            $this->generateVerificationCode();
        }

        // Use the provided code or the one from the database
        $codeToSend = $code ?? $this->verification_code;

        // Update the database to match the code we're sending in the email
        if ($code && $code !== $this->verification_code) {
            $this->verification_code = $code;
            $this->verification_code_expires_at = now()->addHours(24);
            $this->save();
            \Log::info('Updated user verification code in database to match email: ' . $code);
        }

        // Log the code being sent for debugging
        \Log::info('Sending verification email to: ' . $this->email . ' with code: ' . $codeToSend);
        
        // Send the notification with the specific code
        $this->notify(new \App\Notifications\VerifyEmail($codeToSend));
    }
}