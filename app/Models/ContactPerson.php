<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactPerson extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;
    protected $table = 'contact_persons';
    protected $fillable = [
        'id', 'first_name', 'last_name', 'email', 'phone', 'title', 'contact_id', 'contact_clerk'
    ];

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function opportunities()
    {
        return $this->hasMany(Opportunity::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }
}