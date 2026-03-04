<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return true;
    }

    public function view(?User $user, User $model)
    {
        return $user && ($user->id === $model->id || $user->role === 'admin');
    }

    public function create(?User $user)
    {
        return true;
    }

    public function update(?User $user, User $model)
    {
        return $user && ($user->id === $model->id || $user->role === 'admin');
    }

    public function delete(?User $user, User $model)
    {
        return $user && $user->role === 'admin';
    }
}