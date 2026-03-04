<?php

namespace App\Policies;

use App\Models\RatesEmail;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class RatesEmailPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, RatesEmail $ratesEmail)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, RatesEmail $ratesEmail)
    {
        return $user !== null;
    }

    public function delete(?User $user, RatesEmail $ratesEmail)
    {
        return $user !== null;
    }
}