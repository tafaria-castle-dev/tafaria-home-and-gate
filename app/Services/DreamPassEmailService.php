<?php

namespace App\Services;

use App\Mail\DreamPassEmail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class DreamPassEmailService
{
    public function createDreamPass(
        User $user,
        string $name,
        string $url,
        string $roomNumber,
        string $activityCount,
        ?string $checkInDate = null
    ): void {
        Mail::to($user->email)->send(new DreamPassEmail(
            $user,
            $name,
            $roomNumber,
            $activityCount,
            $checkInDate,
            $url,
            'createDreamPass'
        ));
    }


}