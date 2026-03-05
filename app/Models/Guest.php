<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Guest extends Model
{
    protected $fillable = [
        'guest_name',
        'section',
        'entry_time',
        'exit_time',
        'check_in',
        'check_out',
        'contact_id',
        'contact_person_id',
        'phone_number',
        'kids_count',
        'adults_count',
        'dream_pass_code',
        'is_express_check_in',
        'is_express_check_out',
        'type',
        'checked_in_by_user_id',
        'checked_in_by_guard_id',
        'cleared_bills',
        'cleared_bills_by_user_id',
        'cleared_by_house_keeping',
        'cleared_by_house_keeping_user_id',
    ];

    protected $casts = [
        'entry_time' => 'datetime',
        'exit_time' => 'datetime',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'is_express_check_in' => 'boolean',
        'is_express_check_out' => 'boolean',
        'cleared_bills' => 'array',
        'cleared_by_house_keeping' => 'array',
    ];

    public function contact()
    {
        return $this->belongsTo(\App\Models\Contact::class);
    }

    public function contactPerson()
    {
        return $this->belongsTo(\App\Models\ContactPerson::class);
    }

    public function checkedInByUser()
    {
        return $this->belongsTo(\App\Models\User::class, 'checked_in_by_user_id');
    }

    public function checkedInByGuard()
    {
        return $this->belongsTo(\App\Models\Guard::class, 'checked_in_by_guard_id');
    }

    public function clearedBillsByUser()
    {
        return $this->belongsTo(\App\Models\User::class, 'cleared_bills_by_user_id');
    }

    public function clearedByHouseKeepingUser()
    {
        return $this->belongsTo(\App\Models\User::class, 'cleared_by_house_keeping_user_id');
    }
}