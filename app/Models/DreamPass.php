<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DreamPass extends Model
{
    use HasFactory;
    protected $fillable = [
        'room_number',
        'guest_name',
        'day_visit',
        'created_by_id',
        'check_in_date',
        'check_out_date',
        'status',
        'needs_director_approval',
        'approved_by_director_id',
        'approved_at',
    ];

    protected $casts = [
        'check_in_date' => 'date',
        'check_out_date' => 'date',
        'approved_at' => 'datetime',
        'needs_director_approval' => 'boolean',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function activities()
    {
        return $this->hasMany(DreamPassActivity::class);
    }

    public function souvenirDiscount()
    {
        return $this->hasOne(DreamPassSouvenirDiscount::class);
    }
}