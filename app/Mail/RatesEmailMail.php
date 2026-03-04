<?php

namespace App\Mail;

use App\Models\RatesEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Queue\SerializesModels;

class RatesEmailMail extends Mailable
{
    use Queueable, SerializesModels;

    public $ratesEmail;
    public $recipientName;
    public $emailSubject;
    public $emailDescription;

    public function __construct(RatesEmail $ratesEmail, $recipientName = null)
    {
        $this->ratesEmail = $ratesEmail;
        $this->recipientName = $recipientName;
        $this->emailSubject = $ratesEmail->subject;
        $this->emailDescription = $ratesEmail->description;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->emailSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            html: 'emails.rates-email',
        );
    }

    public function attachments(): array
    {
        $attachments = [];

        foreach ($this->ratesEmail->attachments as $attachment) {
            $attachments[] = Attachment::fromStorage('public/' . $attachment->file_path)
                ->as($attachment->file_name)
                ->withMime($attachment->mime_type);
        }

        return $attachments;
    }
}