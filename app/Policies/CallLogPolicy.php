<?php

namespace App\Policies;

use App\Models\CallLog;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CallLogPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, CallLog $callLog)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, CallLog $callLog)
    {
        return $user !== null;
    }

    public function delete(?User $user, CallLog $callLog)
    {
        return $user !== null;
    }
}