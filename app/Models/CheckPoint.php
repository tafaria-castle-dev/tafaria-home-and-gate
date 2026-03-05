<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CheckPoint extends Model
{
    protected $fillable = [
        'point_name',
        'location',
    ];

    public function patrolCheckpoints()
    {
        return $this->hasMany(PatrolCheckpoint::class, 'check_point_id');
    }
}