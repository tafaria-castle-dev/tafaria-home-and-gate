<?php

namespace App\Policies;

use App\Models\Reservation;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ReservationPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, Reservation $reservation)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, Reservation $reservation)
    {
        return $user !== null;
    }

    public function delete(?User $user, Reservation $reservation)
    {
        return $user && $user->role === 'admin';
    }
}