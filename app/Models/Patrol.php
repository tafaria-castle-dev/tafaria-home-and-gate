<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
class Patrol extends Model
{
    use HasFactory;

    protected $table = 'patrols';

    protected $fillable = ['guard_id', 'shift_id', 'status', 'started_at', 'ended_at', 'notes'];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function patrolGuard()
    {
        return $this->belongsTo(\App\Models\User::class, 'guard_id');
    }

    public function shift()
    {
        return $this->belongsTo(PatrolShift::class, 'shift_id');
    }

    public function checkpoints()
    {
        return $this->hasMany(PatrolCheckpoint::class, 'patrol_id')->orderBy('scanned_at');
    }

    public function incidents()
    {
        return $this->hasMany(PatrolIncident::class, 'patrol_id');
    }

    public function getDurationMinutesAttribute()
    {
        if (!$this->started_at)
            return null;
        $end = $this->ended_at ?? now();
        return $this->started_at->diffInMinutes($end);
    }

    protected $appends = ['duration_minutes'];
}
