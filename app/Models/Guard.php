<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Guard extends Model
{
    protected $fillable = [
        'name',
        'badge_number',
    ];

    public function patrols()
    {
        return $this->hasMany(Patrol::class);
    }
}