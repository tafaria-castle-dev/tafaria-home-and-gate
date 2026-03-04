<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Tax extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'name', 'tax_code', 'rate'
    ];

    public function additionals()
    {
        return $this->belongsToMany(Additional::class);
    }

    public function packages()
    {
        return $this->belongsToMany(Package::class);
    }

    public function corporateRoomSettings()
    {
        return $this->belongsToMany(CorporateRoomSetting::class);
    }
}