<?php

namespace App\Policies;

use App\Models\Tax;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class TaxPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return true;
    }

    public function view(?User $user, Tax $tax)
    {
        return true;
    }

    public function create(?User $user)
    {
        return $user && $user->role === 'admin';
    }

    public function update(?User $user, Tax $tax)
    {
        return $user && $user->role === 'admin';
    }

    public function delete(?User $user, Tax $tax)
    {
        return $user && $user->role === 'admin';
    }
}