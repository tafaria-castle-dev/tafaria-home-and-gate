<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Patrol extends Model
{
    protected $fillable = [
        'guard_id',
        'status',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function patrolGuard()
    {
        return $this->belongsTo(Guard::class);
    }

    public function patrolCheckpoints()
    {
        return $this->hasMany(PatrolCheckpoint::class);
    }

    public function checkpoints()
    {
        return $this->belongsToMany(CheckPoint::class, 'patrol_checkpoints', 'patrol_id', 'check_point_id')
            ->withPivot('scanned_at')
            ->withTimestamps();
    }
}