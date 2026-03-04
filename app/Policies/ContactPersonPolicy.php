<?php

namespace App\Policies;

use App\Models\ContactPerson;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ContactPersonPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, ContactPerson $contactPerson)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, ContactPerson $contactPerson)
    {
        return $user !== null;
    }

    public function delete(?User $user, ContactPerson $contactPerson)
    {
        return $user !== null;
    }
}