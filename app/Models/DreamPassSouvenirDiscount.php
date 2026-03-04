<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DreamPassSouvenirDiscount extends Model
{
    use HasFactory;

    protected $fillable = [
        'dream_pass_id',
        'discount_percentage',
        'valid_from',
        'valid_to',
        'applicable_items',
    ];

    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
        'applicable_items' => 'array',
    ];
}