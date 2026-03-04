<?php

namespace App\Policies;

use App\Models\Quotation;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class QuotationPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return true;
    }

    public function view(?User $user, Quotation $quotation)
    {
        return true;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, Quotation $quotation)
    {
        return $user !== null;
    }

    public function delete(?User $user, Quotation $quotation)
    {
        return $user && $user->role === 'admin';
    }
}