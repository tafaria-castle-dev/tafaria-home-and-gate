<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailActivity extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'subject',
        'description',
        'description_json',
        'type',
        'opportunity_id',
        'template_id',
        'created_by_id',
        'super_staff'
    ];

    protected $casts = [
        'description_json' => 'array',
        'type' => 'string'
    ];

    public function opportunity()
    {
        return $this->belongsTo(Opportunity::class, 'opportunity_id');
    }

    public function template()
    {
        return $this->belongsTo(EmailTemplate::class, 'template_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function attachments()
    {
        return $this->hasMany(EmailAttachment::class, 'email_id');
    }
}