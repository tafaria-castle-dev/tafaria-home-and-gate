<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CorporateRoomSetting extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'board_type', 'room_type', 'description', 'amount_ksh', 'taxable_amount'
    ];

    protected $casts = [
        'room_type' => 'string'
    ];

    public function taxes()
    {
        return $this->belongsToMany(Tax::class, 'corporate_room_setting_tax');
    }

   
}