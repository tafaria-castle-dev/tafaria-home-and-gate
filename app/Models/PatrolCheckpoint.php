<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatrolCheckpoint extends Model
{
    protected $fillable = [
        'patrol_id',
        'check_point_id',
        'scanned_at',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function patrol()
    {
        return $this->belongsTo(Patrol::class);
    }

    public function checkPoint()
    {
        return $this->belongsTo(CheckPoint::class, 'check_point_id');
    }
}