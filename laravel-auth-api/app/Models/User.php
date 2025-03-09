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
        
        // Store the code and set expiration time (1 hour from now)
        $this->verification_code = $code;
        $this->verification_code_expires_at = now()->addHour();
        $this->save();
        
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
     * Send the email verification notification.
     *
     * @return void
     */
    public function sendEmailVerificationNotification(): void
    {
        \Log::info('Sending verification email to: ' . $this->email);
        // Generate a new verification code
        $code = $this->generateVerificationCode();
        
        // Send the notification with the code
        try {
            $this->notify(new VerifyEmailWithCode($code));
            \Log::info('Notification sent successfully');
    } catch (\Exception $e) {
        \Log::error('Error sending notification: ' . $e->getMessage());
    }
}
}