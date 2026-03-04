<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'institution', 'mobile', 'type','created_at', 'updated_at', 'contact_persons'
    ];

   protected $casts = [
    'type' => 'string',
    'contact_persons' => 'array',
];
    public function opportunities()
    {
        return $this->hasMany(Opportunity::class);
    }

    public function reservations()
    {
        return $this->hasMany(Reservation::class);
    }

    public function bulkEmails()
    {
        return $this->belongsToMany(BulkEmail::class, 'bulk_email_contact');
    }

    public function contactPersons()
    {
        return $this->hasMany(ContactPerson::class);
    }
}