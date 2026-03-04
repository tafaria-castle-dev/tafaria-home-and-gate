<?php

namespace App\Policies;

use App\Models\OpportunityName;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OpportunityNamePolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, OpportunityName $opportunityName)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, OpportunityName $opportunityName)
    {
        return $user !== null;
    }

    public function delete(?User $user, OpportunityName $opportunityName)
    {
        return $user !== null;
    }
}