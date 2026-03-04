<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'contact_id',
        'contact_person_id',
        'check_in_date',
        'check_out_date',
        'car_plate_number',
        'reservation_number',
        'id_or_passport_number',
        'id_or_passport_photo',
        'cleared_for_checkin',
        'cleared_for_checkout',
        'created_by_id'
    ];

    protected $casts = [
        'check_in_date' => 'datetime',
        'check_out_date' => 'datetime',
        'cleared_for_checkin' => 'array',
        'cleared_for_checkout' => 'array'
    ];

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function contactPerson()
    {
        return $this->belongsTo(ContactPerson::class, 'contact_person_id');
    }

    public function created_by()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }
}