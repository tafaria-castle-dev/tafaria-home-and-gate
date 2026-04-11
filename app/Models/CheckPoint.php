<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CheckPoint extends Model
{
    protected $fillable = [
        'point_name',
        'location',
        'qr_link'
    ];

    public function patrolCheckpoints()
    {
        return $this->hasMany(PatrolCheckpoint::class, 'check_point_id');
    }
    public function patrols()
    {
        return $this->belongsToMany(Patrol::class, 'patrol_checkpoints', 'check_point_id', 'patrol_id')
            ->withPivot('scanned_at')
            ->withTimestamps();
    }
}