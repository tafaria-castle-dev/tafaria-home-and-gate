<?php

namespace App\Policies;

use App\Models\LastUpdate;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class LastUpdatePolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, LastUpdate $last_update)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, LastUpdate $last_update)
    {
        return $user !== null;
    }

    public function delete(?User $user, LastUpdate $last_update)
    {
        return false;
    }
}