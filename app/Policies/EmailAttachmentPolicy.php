<?php

namespace App\Policies;

use App\Models\EmailAttachment;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class EmailAttachmentPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, EmailAttachment $emailAttachment)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, EmailAttachment $emailAttachment)
    {
        return $user !== null;
    }

    public function delete(?User $user, EmailAttachment $emailAttachment)
    {
        return $user !== null;
    }
}