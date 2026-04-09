<?php

namespace App\Policies;

use App\Models\PatrolCheckPoint;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PatrolCheckPointPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, PatrolCheckPoint $patrolCheckPoint)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, PatrolCheckPoint $patrolCheckPoint)
    {
        return $user !== null;
    }

    public function delete(?User $user, PatrolCheckPoint $patrolCheckPoint)
    {
        return $user !== null;
    }
}