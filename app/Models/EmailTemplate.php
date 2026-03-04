<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'subject',
        'description',
        'description_json',
        'created_by_id'
    ];

    protected $casts = [
        'description_json' => 'array'
    ];

    public function created_by()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function emailActivities()
    {
        return $this->hasMany(EmailActivity::class, 'template_id');
    }

    public function bulkEmails()
    {
        return $this->hasMany(BulkEmail::class, 'template_id');
    }
}