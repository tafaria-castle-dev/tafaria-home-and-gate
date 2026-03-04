<?php

namespace App\Policies;

use App\Models\BulkEmailAttachment;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BulkEmailAttachmentPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, BulkEmailAttachment $bulkEmailAttachment)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, BulkEmailAttachment $bulkEmailAttachment)
    {
        return $user !== null;
    }

    public function delete(?User $user, BulkEmailAttachment $bulkEmailAttachment)
    {
        return $user !== null;
    }
}