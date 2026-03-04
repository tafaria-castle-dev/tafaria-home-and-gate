<?php

namespace App\Policies;

use App\Models\OpportunityFile;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OpportunityFilePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user)
    {
        return auth()->check();
    }

    public function view(User $user, OpportunityFile $file)
    {
        return auth()->check();
    }

    public function create(User $user)
    {
        return auth()->check();
    }

    public function update(User $user, OpportunityFile $file)
    {
        return auth()->check();
    }

    public function delete(User $user, OpportunityFile $file)
    {
        return auth()->check();
    }
}