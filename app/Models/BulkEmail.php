<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BulkEmail extends Model
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
        'template_id',
        'created_by_id',
        'sent_by',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'description_json' => 'array'
    ];

    public function template()
    {
        return $this->belongsTo(EmailTemplate::class, 'template_id');
    }

    public function created_by()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function recipients()
    {
        return $this->belongsToMany(Contact::class, 'bulk_email_contact');
    }

    public function attachments()
    {
        return $this->hasMany(BulkEmailAttachment::class, 'email_id');
    }
}