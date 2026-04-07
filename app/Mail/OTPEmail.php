<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OTPEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $name;
    public $firstName;
    public $otp;
    public $template;

    public function __construct(
        string $name,
        string $otp,
        string $template
    ) {
        $this->name = $name;
        $this->firstName = explode(' ', $name)[0];
        $this->otp = $otp;
        $this->template = $template;
    }

    public function build()
    {
        $subjects = [
            'accountActivationApp' => 'Verify Your Email - OTP Code',
            'forgotPasswordApp' => 'Password Reset OTP Code',
        ];

        return $this->subject($subjects[$this->template])
            ->view('emails.' . $this->template)
            ->with([
                'firstName' => $this->firstName,
                'otp' => $this->otp,
            ]);
    }
}