<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Package extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'board_type', 'name', 'description', 'amount_ksh', 'resident',
        'room_type', 'number_of_rooms', 'taxable_amount'
    ];

    protected $casts = [
        'resident' => 'string',
        'room_type' => 'string'
    ];

    public function taxes()
    {
        return $this->belongsToMany(Tax::class, 'package_tax');
    }

   
}