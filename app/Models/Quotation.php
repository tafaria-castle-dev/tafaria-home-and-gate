<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'contact_id',
        'contact_person_id',
        'is_invoice_generated',
        'no_accommodation',
        'status',
        'approved_on',
        'quotation_details'
    ];

    protected $casts = [
        'is_invoice_generated' => 'boolean',
        'no_accommodation' => 'boolean',
        'approved_on' => 'datetime',
        'quotation_details' => 'array'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function contactPerson()
    {
        return $this->belongsTo(ContactPerson::class, 'contact_person_id');
    }
}