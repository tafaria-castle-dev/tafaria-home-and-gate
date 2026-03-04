<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RatesEmailRecipient extends Model
{
    use HasFactory;

    protected $table = 'rates_email_recipients';
    public $timestamps = false;

    protected $fillable = [
        'email_id',
        'recipient_type',
        'recipient_id',
        'recipient_email',
        'created_at'
    ];

    protected $casts = [
        'created_at' => 'datetime'
    ];

    public function email()
    {
        return $this->belongsTo(RatesEmail::class, 'email_id');
    }

    public function recipient()
    {
        return $this->morphTo(__FUNCTION__, 'recipient_type', 'recipient_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'recipient_id')->where('recipient_type', 'user');
    }

    public function agent()
    {
        return $this->belongsTo(Agent::class, 'recipient_id')->where('recipient_type', 'agent');
    }
}