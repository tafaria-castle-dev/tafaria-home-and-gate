<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class PatrolCheckpoint extends Model
{
    use HasFactory;

    protected $table = 'patrol_checkpoints';

    protected $fillable = ['patrol_id', 'check_point_id', 'scanned_at'];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function patrol()
    {
        return $this->belongsTo(Patrol::class, 'patrol_id');
    }

    public function checkpoint()
    {
        return $this->belongsTo(CheckPoint::class, 'check_point_id');
    }
}