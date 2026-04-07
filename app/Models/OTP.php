<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OTP extends Model
{
    use HasFactory;

    protected $table = 'otps';

    protected $fillable = [
        'email',
        'otp',
        'expires_at',
        'type',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];
}