<?php
namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DreamPassEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $room_number;
    public $activity_count;
    public $check_in_date;
    public $url;
    public $user;
    public $firstName;
    public $name;
    public $template;

    public function __construct(
        User $user,
        ?string $name = null,
        string $room_number,
        string $activity_count,
        ?string $check_in_date,
        string $url,
        string $template
    ) {
        $this->user = $user;
        $this->firstName = explode(' ', $user->name)[0];
        $this->name = $name;
        $this->room_number = $room_number;
        $this->activity_count = $activity_count;
        $this->check_in_date = $check_in_date;
        $this->url = $url;
        $this->template = $template;
    }

    public function build()
    {
        $subjects = [
            'createDreamPass' => 'DreamPass Created!',
            'approveDreamPass' => 'DreamPass Approved!',
        ];

        return $this->subject($subjects[$this->template])
            ->view('emails.' . $this->template)
            ->with([
                'firstName' => $this->firstName,
                'room_number' => $this->room_number,
                'activity_count' => $this->activity_count,
                'check_in_date' => $this->check_in_date,
                'url' => $this->url,

            ]);
    }
}