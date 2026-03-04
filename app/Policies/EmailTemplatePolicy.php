<?php

namespace App\Policies;

use App\Models\EmailTemplate;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class EmailTemplatePolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, EmailTemplate $emailTemplate)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, EmailTemplate $emailTemplate)
    {
        return $user !== null;
    }

    public function delete(?User $user, EmailTemplate $emailTemplate)
    {
        return $user !== null;
    }
}