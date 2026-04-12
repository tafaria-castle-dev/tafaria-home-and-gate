<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Tax;
class ImmersionPackage extends Model
{
    use HasFactory;

    protected $table = 'immersion_packages';

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'board_type',
        'name',
        'description',
        'amount_ksh',
        'resident',
        'room_type',
        'number_of_rooms',
        'taxable_amount'
    ];

    protected $casts = [
        'resident' => 'string',
        'room_type' => 'string'
    ];

    public function taxes()
    {
        return $this->belongsToMany(Tax::class, 'immersion_package_tax', 'package_id', 'tax_id');
    }
}