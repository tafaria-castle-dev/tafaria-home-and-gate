<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Opportunity extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'stage',
        'description',
        'year',
        'probability',
        'close_date',
        'amount',
        'prepared_by',
        'created_by_id',
        'assistant_clerk_id',
        'contact_id',
        'contact_person_id',
        'last_update_id'
    ];

    protected $casts = [
        'close_date' => 'datetime',
        'files' => 'array',
        'stage' => 'string'
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function assistantClerk()
    {
        return $this->belongsTo(User::class, 'assistant_clerk_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function contactPerson()
    {
        return $this->belongsTo(ContactPerson::class, 'contact_person_id');
    }

    public function lastUpdate()
    {
        return $this->belongsTo(LastUpdate::class, 'last_update_id');
    }

    public function emailActivities()
    {
        return $this->hasMany(EmailActivity::class);
    }

    public function callLogs()
    {
        return $this->hasMany(CallLog::class);
    }
    public function files()
    {
        return $this->hasMany(OpportunityFile::class, 'opportunity_id');
    }
}