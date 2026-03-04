<?php

namespace App\Policies;

use App\Models\AccommodationNote;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AccommodationNotePolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, AccommodationNote $accommodationNote)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, AccommodationNote $accommodationNote)
    {
        return $user!==null;
    }

    public function delete(?User $user, AccommodationNote $accommodationNote)
    {
        return  $user!==null;
    }
}