<?php

namespace App\Services;

use App\Mail\Email;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class EmailService
{
    public function sendAccountActivation(User $user, string $url): void
    {
        Mail::to($user->email)->send(new Email($user, $url, 'accountActivation'));
    }

    public function sendPasswordReset(User $user, string $url): void
    {
        Mail::to($user->email)->send(new Email($user, $url, 'passwordReset'));
    }

    public function createQuotation(
        User $user,
        string $url,
        string $name,
        string $totalCost,
        ?string $institutionName = null
    ): void {
        Mail::to($user->email)->send(new Email(
            $user,
            $url,
            'createQuotation',
            $name,
            $totalCost,
            $institutionName
        ));
    }

    public function approveQuotation(
        User $user,
        string $url,
        string $name,
        string $totalCost,
        ?string $institutionName = null
    ): void {
        Mail::to($user->email)->send(new Email(
            $user,
            $url,
            'approveQuotation',
            $name,
            $totalCost,
            $institutionName
        ));
    }

    public function generateInvoice(
        User $user,
        string $url,
        string $name,
        string $totalCost,
        ?string $institutionName = null
    ): void {
        Mail::to($user->email)->send(new Email(
            $user,
            $url,
            'generateInvoice',
            $name,
            $totalCost,
            $institutionName
        ));
    }

    public function createDraftNotification(
        User $user,
        string $url,
        string $name,
        string $totalCost,
        ?string $institutionName = null,
        string $draftType = 'quotation'
    ): void {
        Mail::to($user->email)->send(new Email(
            $user,
            $url,
            'saveDraft',
            $name,
            $totalCost,
            $institutionName,
            
        ));
    }
}