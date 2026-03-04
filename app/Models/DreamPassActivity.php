<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DreamPassActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'dream_pass_id',
        'activity_name',
        'valid_from',
        'voucher_count',
        'valid_to',
    ];

    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
    ];

    public function dreamPass()
    {
        return $this->belongsTo(DreamPass::class);
    }

    public function redemptions()
    {
        return $this->hasMany(DreamPassActivityRedemption::class);
    }
}

