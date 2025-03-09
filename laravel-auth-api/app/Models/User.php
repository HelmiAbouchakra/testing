<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

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
}