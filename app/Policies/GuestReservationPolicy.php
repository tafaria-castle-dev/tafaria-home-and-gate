<?php

namespace App\Policies;

use App\Models\GuestReservation;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class GuestReservationPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, GuestReservation $guestReservation)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, GuestReservation $guestReservation)
    {
        return $user !== null;
    }

    public function delete(?User $user, GuestReservation $guestReservation)
    {
        return $user !== null;
    }
}