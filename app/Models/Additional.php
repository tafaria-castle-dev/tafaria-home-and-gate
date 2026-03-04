<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Additional extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'name', 'description', 'type', 'resident', 'dynamic', 'amount_ksh', 'taxable_amount','priority'
    ];

    public function taxes()
    {
        return $this->belongsToMany(Tax::class, 'additional_tax');
    }
}