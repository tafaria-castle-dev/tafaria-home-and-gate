<?php

namespace App\Policies;

use App\Models\Package;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class PackagePolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return true;
    }

    public function view(?User $user, Package $package)
    {
        return $user!==null;
    }

    public function create(?User $user)
    {
        return $user && $user->role === 'admin';
    }

    public function update(?User $user, Package $package)
    {
        return $user && $user->role === 'admin';
    }

    public function delete(?User $user, Package $package)
    {
        return $user && $user->role === 'admin';
    }
}