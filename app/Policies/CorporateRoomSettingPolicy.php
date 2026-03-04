<?php

namespace App\Policies;

use App\Models\CorporateRoomSetting;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CorporateRoomSettingPolicy
{
    use HandlesAuthorization;

    public function viewAny(?User $user)
    {
        return true;
    }

    public function view(?User $user, CorporateRoomSetting $corporateRoomSetting)
    {
        return true;
    }

    public function create(?User $user)
    {
        return $user && $user->role === 'admin';
    }

    public function update(?User $user, CorporateRoomSetting $corporateRoomSetting)
    {
        return $user && $user->role === 'admin';
    }

    public function delete(?User $user, CorporateRoomSetting $corporateRoomSetting)
    {
        return $user && $user->role === 'admin';
    }
}