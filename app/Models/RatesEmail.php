<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class RatesEmail extends Model
{
    use HasFactory;

    protected $table = 'rates_emails';
    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'subject',
        'description',
        'description_json',
        'template_id',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'description_json' => 'array'
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function template()
    {
        return $this->belongsTo(EmailTemplate::class, 'template_id');
    }

    public function recipients()
    {
        return $this->hasMany(RatesEmailRecipient::class, 'email_id');
    }

    public function userRecipients()
    {
        return $this->recipients()->where('recipient_type', 'user');
    }

    public function agentRecipients()
    {
        return $this->recipients()->where('recipient_type', 'agent');
    }

    public function attachments()
    {
        return $this->hasMany(RatesEmailAttachment::class, 'email_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'rates_email_recipients', 'email_id', 'recipient_id')
            ->wherePivot('recipient_type', 'user')
            ->withPivot('recipient_email', 'created_at');
    }

    public function agents()
    {
        return $this->belongsToMany(Agent::class, 'rates_email_recipients', 'email_id', 'recipient_id')
            ->wherePivot('recipient_type', 'agent')
            ->withPivot('recipient_email', 'created_at');
    }
}