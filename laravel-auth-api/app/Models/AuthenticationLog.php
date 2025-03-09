<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class AuthenticationLog extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'email',
        'ip_address',
        'user_agent',
        'login_type',
        'login_successful',
        'login_at',
        'logout_at',
        'location',
        'device_name',
        'browser',
        'failure_reason',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'login_successful' => 'boolean',
        'login_at' => 'datetime',
        'logout_at' => 'datetime',
    ];

    /**
     * Get the user that owns the authentication log.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
