<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Notifications\Notifiable;
class User extends Authenticatable
{
    use HasFactory, SoftDeletes, HasApiTokens, Notifiable;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'email',
        'email_password',
        'phone_number',
        'signature',
        'password',
        'email_verified_at',
        'verification_token',
        'deleted',
        'role',
        'password_reset_token',
        'password_reset_expires',
        'password_changed_at',
        'email_password_updated_at',
        'verification_token_expires',
        'pass_code'
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password_reset_expires' => 'datetime',
        'password_changed_at' => 'datetime',
        'email_password_updated_at' => 'datetime',
        'verification_token_expires' => 'datetime',
        'deleted' => 'boolean',
        'role' => 'string'
    ];

    public function posts()
    {
        return $this->hasMany(Post::class, 'created_by_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'user_id');
    }

    public function quotations()
    {
        return $this->hasMany(Quotation::class, 'user_id');
    }

    public function createdOpportunities()
    {
        return $this->hasMany(Opportunity::class, 'created_by_id');
    }

    public function assistantClerkOpportunities()
    {
        return $this->hasMany(Opportunity::class, 'assistant_clerk_id');
    }

    public function emailTemplates()
    {
        return $this->hasMany(EmailTemplate::class, 'created_by_id');
    }

    public function bulkEmails()
    {
        return $this->hasMany(BulkEmail::class, 'created_by_id');
    }

    public function emailActivities()
    {
        return $this->hasMany(EmailActivity::class, 'created_by_id');
    }

    public function callLogs()
    {
        return $this->hasMany(CallLog::class, 'created_by_id');
    }

    public function lastUpdatedOpportunities()
    {
        return $this->hasMany(LastUpdate::class, 'updated_by_id');
    }

    public function customers()
    {
        return $this->hasMany(Customer::class, 'user_id');
    }

    public function reservationsCreated()
    {
        return $this->hasMany(Reservation::class, 'created_by_id');
    }

    public function reservationsCleared()
    {
        return $this->hasMany(Reservation::class, 'cleared_by_id');
    }
}