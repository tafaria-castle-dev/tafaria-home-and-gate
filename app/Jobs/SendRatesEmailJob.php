<?php

namespace App\Jobs;

use App\Mail\RatesEmailMail;
use App\Models\RatesEmail;
use App\Models\User;
use App\Models\Agent;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendRatesEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $ratesEmail;
    protected $recipientEmail;
    protected $recipientType;
    protected $recipientId;

    public $tries = 3;
    public $timeout = 120;

    public function __construct(RatesEmail $ratesEmail, $recipientEmail, $recipientType, $recipientId)
    {
        $this->ratesEmail = $ratesEmail;
        $this->recipientEmail = $recipientEmail;
        $this->recipientType = $recipientType;
        $this->recipientId = $recipientId;
    }

    public function handle(): void
    {
        try {
            $recipientName = null;

            if ($this->recipientType === 'user') {
                $user = User::find($this->recipientId);
                $recipientName = $user ? $user->name : null;
            } elseif ($this->recipientType === 'agent') {
                $agent = Agent::find($this->recipientId);
                $recipientName = $agent ? $agent->name : null;
            }

            Mail::to($this->recipientEmail)->send(
                new RatesEmailMail($this->ratesEmail, $recipientName)
            );

            Log::info("Email sent successfully to {$this->recipientEmail}");

        } catch (\Exception $e) {
            Log::error("Failed to send email to {$this->recipientEmail}: " . $e->getMessage());
            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error("Job failed for email {$this->recipientEmail}: " . $exception->getMessage());
    }
}