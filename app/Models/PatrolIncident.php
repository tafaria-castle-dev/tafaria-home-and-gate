<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PatrolIncident extends Model
{
    use HasFactory;

    protected $table = 'patrol_incidents';

    protected $fillable = [
        'patrol_id',
        'guard_id',
        'check_point_id',
        'title',
        'description',
        'severity',
        'status',
        'reported_at',
        'resolved_at',
        'resolved_by_user_id',
        'resolution_notes',
        'photos',
    ];

    protected $casts = [
        'reported_at' => 'datetime',
        'resolved_at' => 'datetime',
        'photos' => 'array',
    ];

    public function patrol()
    {
        return $this->belongsTo(Patrol::class);
    }
    public function patrolGuard()
    {
        return $this->belongsTo(User::class, 'guard_id');
    }
    public function checkpoint()
    {
        return $this->belongsTo(CheckPoint::class, 'check_point_id');
    }
    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by_user_id');
    }
}