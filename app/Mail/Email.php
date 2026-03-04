<?php
namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class Email extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $firstName;
    public $url;
    public $name;
    public $totalCost;
    public $institutionName;
    public $template;

    public function __construct(
        User $user,
        string $url,
        string $template,
        ?string $name = null,
        ?string $totalCost = null,
        ?string $institutionName = null
    ) {
        $this->user = $user;
        $this->firstName = explode(' ', $user->name)[0];
        $this->url = $url;
        $this->name = $name;
        $this->totalCost = $totalCost;
        $this->institutionName = $institutionName;
        $this->template = $template;
    }

    public function build()
    {
        $subjects = [
            'passwordReset' => 'Your password reset token (valid for only 10 minutes)',
            'accountActivation' => 'Welcome to WofTafaria!',
            'createQuotation' => 'Quotation Created!',
            'approveQuotation' => 'Quotation Approved!',
            'generateInvoice' => 'Invoice Generated!',
            'saveDraft' => 'Draft Saved!',
        ];

        return $this->subject($subjects[$this->template])
            ->view('emails.' . $this->template)
            ->with([
                'firstName' => $this->firstName,
                'url' => $this->url,
                'name' => $this->name,
                'totalCost' => $this->totalCost,
                'institutionName' => $this->institutionName,
            ]);
    }
}