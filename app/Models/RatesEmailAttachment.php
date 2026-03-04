<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RatesEmailAttachment extends Model
{
    use HasFactory;

    protected $table = 'rates_email_attachments';
    public $timestamps = false;

    protected $fillable = [
        'email_id',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'created_at'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'file_size' => 'integer'
    ];

    public function email()
    {
        return $this->belongsTo(RatesEmail::class, 'email_id');
    }
}