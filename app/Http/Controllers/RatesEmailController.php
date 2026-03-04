<?php

namespace App\Http\Controllers;

use App\Models\RatesEmail;
use App\Models\RatesEmailRecipient;
use App\Models\RatesEmailAttachment;
use App\Models\User;
use App\Models\Agent;
use App\Jobs\SendRatesEmailJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class RatesEmailController extends Controller
{
    public function index()
    {
        $this->authorize('viewAny', RatesEmail::class);
        return RatesEmail::with(['recipients', 'attachments', 'template', 'users', 'agents'])->get();
    }

    public function store(Request $request)
    {
        $this->authorize('create', RatesEmail::class);

        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'description' => 'required|string',
            'template_id' => 'nullable|string|exists:email_templates,id',
            'recipients' => 'required|string',
            'sent_by' => 'nullable|string',
            'created_by_id' => 'nullable|string',
            'attachments' => 'nullable|array'
        ]);

        DB::beginTransaction();
        try {
            $ratesEmail = RatesEmail::create([
                'id' => (string) Str::uuid(),
                'subject' => $validated['subject'],
                'description' => $validated['description'],
                'description_json' => json_decode($validated['description'], true),
                'template_id' => $validated['template_id'] ?? null
            ]);

            $recipients = json_decode($validated['recipients'], true);
            $recipientsCreated = [];

            Log::info('Processing recipients', ['recipients' => $recipients]);

            foreach ($recipients as $recipientData) {
                $recipientType = $recipientData['type'];
                $recipientId = $recipientData['id'];
                $recipientEmail = $recipientData['email'];

                Log::info('Processing recipient', [
                    'type' => $recipientType,
                    'id' => $recipientId,
                    'email' => $recipientEmail
                ]);

                $recipient = RatesEmailRecipient::create([
                    'email_id' => $ratesEmail->id,
                    'recipient_type' => $recipientType,
                    'recipient_id' => $recipientId,
                    'recipient_email' => $recipientEmail
                ]);

                $recipientsCreated[] = [
                    'email' => $recipientEmail,
                    'type' => $recipientType,
                    'id' => $recipientId
                ];

                Log::info('Recipient created', ['recipient' => $recipient]);
            }

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $fileName = time() . '_' . $file->getClientOriginalName();
                    $filePath = $file->store('rates_email_attachments', 'public');

                    RatesEmailAttachment::create([
                        'email_id' => $ratesEmail->id,
                        'file_name' => $fileName,
                        'file_path' => $filePath,
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType()
                    ]);
                }
            }

            DB::commit();

            Log::info('Dispatching jobs for recipients', ['count' => count($recipientsCreated)]);

            foreach ($recipientsCreated as $recipient) {
                SendRatesEmailJob::dispatch(
                    $ratesEmail,
                    $recipient['email'],
                    $recipient['type'],
                    $recipient['id']
                )->onQueue('emails');
            }

            $ratesEmail->load(['recipients', 'attachments', 'users', 'agents']);

            return response()->json([
                'message' => 'Emails queued successfully',
                'data' => $ratesEmail,
                'recipients_count' => count($recipientsCreated)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to send email', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Failed to send email',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $ratesEmail = RatesEmail::with(['recipients', 'attachments', 'template', 'users', 'agents'])->findOrFail($id);
        $this->authorize('view', $ratesEmail);
        return response()->json($ratesEmail);
    }

    public function update(Request $request, $id)
    {
        $ratesEmail = RatesEmail::findOrFail($id);
        $this->authorize('update', $ratesEmail);

        $validated = $request->validate([
            'subject' => 'string|max:255',
            'description' => 'string',
            'template_id' => 'nullable|string|exists:email_templates,id',
            'recipients' => 'nullable|string',
            'attachments' => 'nullable|array'
        ]);

        DB::beginTransaction();
        try {
            $ratesEmail->update([
                'subject' => $validated['subject'] ?? $ratesEmail->subject,
                'description' => $validated['description'] ?? $ratesEmail->description,
                'description_json' => isset($validated['description']) ? json_decode($validated['description'], true) : $ratesEmail->description_json,
                'template_id' => $validated['template_id'] ?? $ratesEmail->template_id
            ]);

            if (isset($validated['recipients'])) {
                $ratesEmail->recipients()->delete();

                $recipients = json_decode($validated['recipients'], true);

                foreach ($recipients as $recipientData) {
                    $recipientType = $recipientData['type'];
                    $recipientId = $recipientData['id'];
                    $recipientEmail = $recipientData['email'];

                    RatesEmailRecipient::create([
                        'email_id' => $ratesEmail->id,
                        'recipient_type' => $recipientType,
                        'recipient_id' => $recipientId,
                        'recipient_email' => $recipientEmail
                    ]);
                }
            }

            if ($request->hasFile('attachments')) {
                foreach ($request->file('attachments') as $file) {
                    $fileName = time() . '_' . $file->getClientOriginalName();
                    $filePath = $file->store('rates_email_attachments', 'public');

                    RatesEmailAttachment::create([
                        'email_id' => $ratesEmail->id,
                        'file_name' => $fileName,
                        'file_path' => $filePath,
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType()
                    ]);
                }
            }

            DB::commit();

            $ratesEmail->load(['recipients', 'attachments', 'users', 'agents']);

            return response()->json([
                'message' => 'Email updated successfully',
                'data' => $ratesEmail
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update email',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $ratesEmail = RatesEmail::findOrFail($id);
        $this->authorize('delete', $ratesEmail);

        DB::beginTransaction();
        try {
            foreach ($ratesEmail->attachments as $attachment) {
                \Storage::disk('public')->delete($attachment->file_path);
            }

            $ratesEmail->delete();

            DB::commit();

            return response()->json(['message' => 'Email deleted successfully'], 204);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to delete email',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}