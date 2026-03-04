<?php
namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ResetPasswordEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $firstName;
    public $url;

    public $template;

    public function __construct(
        User $user,
        string $url,
        string $template,
    ) {
        $this->user = $user;
        $this->firstName = explode(' ', $user->name)[0];
        $this->url = $url;
        $this->template = $template;
    }

    public function build()
    {
        $subjects = [
            'passwordReset' => 'Your password reset token (valid for only 10 minutes)',
            'accountActivation' => 'Welcome to WofTafaria!',

        ];

        return $this->subject($subjects[$this->template])
            ->view('emails.' . $this->template)
            ->with([
                'firstName' => $this->firstName,
                'url' => $this->url,

            ]);
    }
}