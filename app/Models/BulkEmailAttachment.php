<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BulkEmailAttachment extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'file_name', 'file_path', 'file_size', 'file_type', 'email_id'
    ];

    public function bulkEmail()
    {
        return $this->belongsTo(BulkEmail::class, 'email_id');
    }
}