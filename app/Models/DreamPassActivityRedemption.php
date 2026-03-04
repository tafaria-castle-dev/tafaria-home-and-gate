<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DreamPassActivityRedemption extends Model
{
    use HasFactory;
    public $timestamps = false;
    protected $fillable = [
        'dream_pass_activity_id',
        'redeemed_at',
        'redeemed_by_staff_id',
        'staff_passcode',
    ];

    protected $casts = [
        'redeemed_at' => 'datetime',
    ];
}