<?php

namespace App\Policies;

use App\Models\ImmersionPackage;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ImmersionPackagePolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return true;
    }

    public function view(?User $user, ImmersionPackage $immersionPackage)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user && $user->role === 'admin';
    }

    public function update(?User $user, ImmersionPackage $immersionPackage)
    {
        return $user && $user->role === 'admin';
    }

    public function delete(?User $user, ImmersionPackage $immersionPackage)
    {
        return $user && $user->role === 'admin';
    }
}