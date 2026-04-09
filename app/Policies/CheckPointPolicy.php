<?php

namespace App\Policies;

use App\Models\CheckPoint;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CheckPointPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, CheckPoint $checkPoint)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, CheckPoint $checkPoint)
    {
        return $user !== null;
    }

    public function delete(?User $user, CheckPoint $checkPoint)
    {
        return $user !== null;
    }
}