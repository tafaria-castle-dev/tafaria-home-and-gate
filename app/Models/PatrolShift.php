<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PatrolShift extends Model
{
    use HasFactory;

    protected $table = 'patrol_shifts';

    protected $fillable = ['name', 'start_time', 'end_time'];

    public function patrols()
    {
        return $this->hasMany(Patrol::class, 'shift_id');
    }

    public function getFormattedStartTimeAttribute()
    {
        return \Carbon\Carbon::createFromFormat('H:i:s', $this->start_time)->format('h:i A');
    }

    public function getFormattedEndTimeAttribute()
    {
        return \Carbon\Carbon::createFromFormat('H:i:s', $this->end_time)->format('h:i A');
    }

    protected $appends = ['formatted_start_time', 'formatted_end_time'];
}