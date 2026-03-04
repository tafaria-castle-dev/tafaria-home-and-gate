<?php

namespace App\Policies;

use App\Models\EmailActivity;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class EmailActivityPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, EmailActivity $emailActivity)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, EmailActivity $emailActivity)
    {
        return $user !== null;
    }

    public function delete(?User $user, EmailActivity $emailActivity)
    {
        return $user !== null;
    }
}