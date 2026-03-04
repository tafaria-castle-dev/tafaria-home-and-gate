<?php

namespace App\Services;

use App\Mail\ResetPasswordEmail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class ResetPasswordEmailService
{
    public function sendAccountActivation(User $user, string $url): void
    {
        Mail::to($user->email)->send(new ResetPasswordEmail($user, $url, 'accountActivation'));
    }

    public function sendPasswordReset(User $user, string $url): void
    {
        Mail::to($user->email)->send(new ResetPasswordEmail($user, $url, 'passwordReset'));
    }

}