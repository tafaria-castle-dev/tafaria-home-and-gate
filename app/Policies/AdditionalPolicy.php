<?php

namespace App\Policies;

use App\Models\Additional;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AdditionalPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return true;
    }

    public function view(?User $user, Additional $additional)
    {
        return true;
    }

    public function create(?User $user)
    {
        return $user && $user->role === 'admin';
    }

    public function update(?User $user, Additional $additional)
    {
        return $user && $user->role === 'admin';
    }

    public function delete(?User $user, Additional $additional)
    {
        return $user && $user->role === 'admin';
    }
}