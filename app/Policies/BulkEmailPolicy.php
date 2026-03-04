<?php

namespace App\Policies;

use App\Models\BulkEmail;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class BulkEmailPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return $user !== null;
    }

    public function view(?User $user, BulkEmail $bulkEmail)
    {
        return $user !== null;
    }

    public function create(?User $user)
    {
        return $user !== null;
    }

    public function update(?User $user, BulkEmail $bulkEmail)
    {
        return $user !== null;
    }

    public function delete(?User $user, BulkEmail $bulkEmail)
    {
        return $user !== null;
    }
}